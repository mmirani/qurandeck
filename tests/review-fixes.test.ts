import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { emptyLibrary } from "../src/lib/library";
import { JAKARTA_FONT_URL, readBundled } from "../src/lib/og/share-image";
import { NASKH_FONT_URL } from "../src/lib/og/naskh";
import { creditLine, translationCredit } from "../src/lib/quran/credits";
import { juzStaticParams, parseJuzId, parseSurahId, surahStaticParams } from "../src/lib/quran/ids";
import { libraryChangeKind, pushDelayMs, shouldPullLibrary } from "../src/lib/library-sync-plan";
import { MemoryRateLimitStore } from "../src/lib/rate-limit";
import { quranRequestAllowed } from "../src/lib/quran/same-origin";

const root = new URL("..", import.meta.url);

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

describe("edition credits", () => {
  it("fills the default translation from source metadata when the payload omits the name", () => {
    const credit = translationCredit(20, {}, []);
    assert.equal(credit.name, "Saheeh International");
    assert.equal(credit.authorName, "Saheeh International");
    const fromCatalog = translationCredit(19, {}, [{ id: 19, name: "M. Pickthall", authorName: "Mohammed Marmaduke William Pickthall" }]);
    assert.equal(fromCatalog.name, "M. Pickthall");
    const fromPayload = translationCredit(19, { resource_name: "Payload edition", author_name: "A translator" }, [
      { id: 19, name: "M. Pickthall", authorName: "Someone else" },
    ]);
    assert.equal(fromPayload.name, "Payload edition");
    assert.equal(fromPayload.authorName, "A translator");
    assert.equal(creditLine("Saheeh International", "Saheeh International"), "Saheeh International");
    assert.equal(creditLine("Ibn Kathir (Abridged)", "Hafiz Ibn Kathir"), "Ibn Kathir (Abridged) · Hafiz Ibn Kathir");
  });

  it("keeps the verse mapper from dropping the name", () => {
    const server = readFileSync(new URL("../src/lib/quran/server.ts", import.meta.url), "utf8");
    assert.equal(server.includes("translationName: undefined"), false);
    assert.match(server, /translationCredit/);
    assert.match(server, /authorName: known\?\.authorName/);
    const card = readFileSync(new URL("../src/components/reader/verse-card.tsx", import.meta.url), "utf8");
    assert.match(card, /EditionCredit/);
    assert.match(card, /Translation:/);
    const tafsir = readFileSync(new URL("../src/components/reader/tafsir-panel.tsx", import.meta.url), "utf8");
    assert.match(tafsir, /Tafsir author/);
    const player = readFileSync(new URL("../src/components/audio/audio-player.tsx", import.meta.url), "utf8");
    assert.match(player, /Reciter:/);
  });
});

describe("quran route is same-origin", () => {
  it("allows the app and curl, and rejects another site", () => {
    assert.equal(
      quranRequestAllowed({ host: "qurandeck.com", origin: null, referer: null, secFetchSite: null }),
      true,
    );
    assert.equal(
      quranRequestAllowed({
        host: "qurandeck.com",
        origin: "https://www.qurandeck.com",
        referer: null,
        secFetchSite: "same-site",
      }),
      true,
    );
    assert.equal(
      quranRequestAllowed({
        host: "qurandeck.com",
        origin: "https://evil.example",
        referer: null,
        secFetchSite: "cross-site",
      }),
      false,
    );
    assert.equal(
      quranRequestAllowed({
        host: "qurandeck-git-preview.vercel.app",
        origin: "https://other-app.vercel.app",
        referer: null,
        secFetchSite: "same-site",
      }),
      false,
    );
    const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
    assert.match(proxy, /quranCacheHeaders/);
    assert.match(proxy, /quranRequestAllowed/);
    assert.equal(proxy.includes("Access-Control-Allow-Origin"), false);
  });
});

describe("reading shell and sync cadence", () => {
  it("prerenders every surah and juz", () => {
    const surahs = surahStaticParams();
    const juzs = juzStaticParams();
    assert.equal(surahs.length, 114);
    assert.equal(juzs.length, 30);
    assert.equal(parseSurahId(surahs[0].id), 1);
    assert.equal(parseSurahId(surahs[113].id), 114);
    assert.equal(parseJuzId(juzs[29].id), 30);
    const page = readFileSync(new URL("../src/app/surah/[id]/page.tsx", import.meta.url), "utf8");
    assert.match(page, /generateStaticParams/);
    assert.match(page, /revalidate = 86400/);
  });

  it("pushes the saved ayah quickly and the reading meter slowly", () => {
    const base = emptyLibrary();
    assert.equal(libraryChangeKind(base, { ...base }), "none");
    const meter = { ...base, progress: { ...base.progress, totalSeconds: base.progress.totalSeconds + 15 } };
    assert.equal(libraryChangeKind(base, meter), "meter");
    const place = {
      ...base,
      progress: { ...base.progress, lastVerseKey: "2:15", lastActiveAt: 50 },
    };
    assert.equal(libraryChangeKind(base, place), "durable");
    assert.equal(pushDelayMs("durable", 0), 2_000);
    assert.equal(pushDelayMs("meter", 0), 120_000);
    assert.equal(shouldPullLibrary(4_000, 0, 5_000), false);
    assert.equal(shouldPullLibrary(5_000, 0, 5_000), true);
  });
});

describe("server-only quran client", () => {
  it("keeps credential helpers out of client modules", () => {
    const qf = readFileSync(new URL("../src/lib/quran/qf.ts", import.meta.url), "utf8");
    const server = readFileSync(new URL("../src/lib/quran/server.ts", import.meta.url), "utf8");
    assert.match(qf, /import "server-only"/);
    assert.match(server, /import "server-only"/);
    const files = walk(new URL("./src", root).pathname).filter((file) => {
      const text = readFileSync(file, "utf8");
      return text.startsWith('"use client"') || text.startsWith("'use client'");
    });
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.equal(/quran\/qf(?:-config)?["']/.test(text), false, file);
      assert.equal(/quran\/server["']/.test(text), false, file);
      assert.equal(/quran\/surah-seed["']/.test(text), false, file);
    }
  });
});

describe("share fonts are bundled", () => {
  it("reads Jakarta and Naskh through their module URLs", async () => {
    const jakarta = await readBundled(JAKARTA_FONT_URL, "src/assets/fonts/PlusJakartaSans-SemiBold.ttf");
    const naskh = await readFileSyncBuffer(NASKH_FONT_URL);
    assert.ok(jakarta.byteLength > 1000);
    assert.ok(naskh.byteLength > 1000);
    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(config, /outputFileTracingIncludes/);
    assert.match(config, /\/surah\/\[id\]\/opengraph-image/);
    assert.match(config, /\/opengraph-image/);
  });
});

describe("rate limit store", () => {
  it("keeps buckets behind a store the proxy can swap later", () => {
    const key = `store-${Date.now()}`;
    const custom = new MemoryRateLimitStore();
    assert.equal(custom.take(key, 1, 1_000, 10).ok, true);
    assert.equal(custom.take(key, 1, 1_000, 20).ok, false);
    const source = readFileSync(new URL("../src/lib/rate-limit.ts", import.meta.url), "utf8");
    assert.match(source, /setRateLimitStore/);
    assert.match(source, /rateLimitStore\.take/);
  });
});

function readFileSyncBuffer(url: URL) {
  return readFileSync(url);
}
