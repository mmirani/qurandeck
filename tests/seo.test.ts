import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CANONICAL_ORIGIN, siteUrl } from "../src/lib/brand";
import { htmlLang } from "../src/lib/quran/languages";
import {
  canonicalRedirectUrl,
  googleSiteVerification,
  homeStructuredData,
  robotRules,
  surahBreadcrumb,
} from "../src/lib/seo";
import sitemap from "../src/app/sitemap";

describe("canonical origin", () => {
  it("stays on the apex even when a preview host is configured", () => {
    const previous = process.env.VERCEL_URL;
    process.env.VERCEL_URL = "qurandeck-git-preview.vercel.app";
    assert.equal(siteUrl(), CANONICAL_ORIGIN);
    process.env.VERCEL_URL = previous;
  });
});

describe("host redirects", () => {
  it("sends www and the vercel.app alias to the apex", () => {
    assert.equal(canonicalRedirectUrl("www.qurandeck.com", "/surah/1", ""), "https://qurandeck.com/surah/1");
    assert.equal(
      canonicalRedirectUrl("qurandeck.vercel.app", "/read", "?x=1"),
      "https://qurandeck.com/read?x=1",
    );
    assert.equal(canonicalRedirectUrl("WWW.qurandeck.com:443", "/", ""), "https://qurandeck.com/");
  });

  it("leaves the apex, preview hosts, and auth callbacks alone", () => {
    assert.equal(canonicalRedirectUrl("qurandeck.com", "/", ""), null);
    assert.equal(canonicalRedirectUrl("qurandeck-git-seo.vercel.app", "/read", ""), null);
    assert.equal(canonicalRedirectUrl("qurandeck.vercel.app", "/api/auth/callback/google", "?code=1"), null);
    assert.equal(canonicalRedirectUrl("localhost", "/", ""), null);
  });
});

describe("robots", () => {
  it("allows the public site and hides private routes in production", () => {
    const rules = robotRules("production");
    assert.equal(rules.sitemap, "https://qurandeck.com/sitemap.xml");
    assert.equal(rules.host, "https://qurandeck.com");
    const rule = (Array.isArray(rules.rules) ? rules.rules[0] : rules.rules)!;
    assert.deepEqual(rule.disallow, ["/api/", "/auth/", "/admin", "/beta"]);
    assert.equal(rule.allow, "/");
  });

  it("hides preview deployments", () => {
    const rules = robotRules("preview");
    const rule = (Array.isArray(rules.rules) ? rules.rules[0] : rules.rules)!;
    assert.equal(rule.disallow, "/");
    assert.equal(rules.sitemap, undefined);
  });
});

describe("sitemap", () => {
  it("lists the public pages and all 114 surahs on the apex", () => {
    const urls = sitemap().map((entry) => entry.url);
    assert.equal(urls.length, 120);
    assert.ok(urls.every((url) => url.startsWith("https://qurandeck.com")));
    assert.ok(urls.includes("https://qurandeck.com"));
    assert.ok(urls.includes("https://qurandeck.com/read"));
    assert.ok(urls.includes("https://qurandeck.com/privacy"));
    assert.ok(urls.includes("https://qurandeck.com/about"));
    assert.ok(urls.includes("https://qurandeck.com/surah/1"));
    assert.ok(urls.includes("https://qurandeck.com/surah/114"));
    assert.equal(urls.some((url) => url.includes("/admin") || url.includes("/api") || url.includes("/juz") || url.includes("/auth")), false);
  });
});

describe("structured data", () => {
  it("describes the site without a search action", () => {
    const data = homeStructuredData();
    const types = data["@graph"].map((node) => node["@type"]);
    assert.deepEqual(types, ["WebSite", "Organization", "WebApplication"]);
    const encoded = JSON.stringify(data);
    assert.equal(encoded.includes("SearchAction"), false);
    assert.equal(encoded.includes('"price":"0"'), true);
  });

  it("builds a three-step surah breadcrumb", () => {
    const data = surahBreadcrumb({ id: 1, name: "Al-Fatihah" });
    assert.equal(data["@type"], "BreadcrumbList");
    assert.deepEqual(
      data.itemListElement.map((item) => item.position),
      [1, 2, 3],
    );
    assert.equal(data.itemListElement[2].item, "https://qurandeck.com/surah/1");
    assert.equal(data.itemListElement[2].name, "Al-Fatihah");
  });
});

describe("search console verification", () => {
  it("renders only when the env var is set", () => {
    assert.equal(googleSiteVerification(""), undefined);
    assert.equal(googleSiteVerification("   "), undefined);
    assert.equal(googleSiteVerification(undefined), undefined);
    assert.equal(googleSiteVerification("abc123"), "abc123");
  });
});

describe("html lang", () => {
  it("uses BCP 47 codes", () => {
    assert.equal(htmlLang("english"), "en");
    assert.equal(htmlLang("Divehi"), "dv");
    assert.equal(htmlLang("Farsi"), "fa");
    assert.equal(htmlLang("not-a-language-xyz"), undefined);
  });
});
