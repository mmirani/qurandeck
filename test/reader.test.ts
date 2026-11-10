import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalLanguage, groupLanguages, scriptClass } from "../src/lib/quran/languages";
import { parseJuzId, parseSurahId } from "../src/lib/quran/ids";
import { stripHtml } from "../src/lib/quran/sources";
import { grantsToApply, isRankVerseKey, RANK_DAY_CAP } from "../src/lib/reading-ranks";
import { limitForPath, rateLimit } from "../src/lib/rate-limit";
import { matchHelper } from "../src/lib/guide/commands";
import { readableExcerpt } from "../src/lib/text";
import type { TranslationResource } from "../src/lib/quran/types";

describe("surah ids", () => {
  it("accepts 1 through 114", () => {
    assert.equal(parseSurahId("1"), 1);
    assert.equal(parseSurahId("114"), 114);
    assert.equal(parseSurahId("999"), null);
    assert.equal(parseSurahId("0"), null);
    assert.equal(parseSurahId("1a"), null);
    assert.equal(parseSurahId("01"), null);
    assert.equal(parseJuzId("30"), 30);
    assert.equal(parseJuzId("31"), null);
  });
});

describe("languages", () => {
  it("merges duplicate and odd labels", () => {
    assert.deepEqual(canonicalLanguage("Divehi, Dhivehi, Maldivian"), { key: "divehi", label: "Divehi" });
    assert.equal(canonicalLanguage("Divehi").key, "divehi");
    assert.deepEqual(canonicalLanguage("Yau,Yuw"), { key: "yau", label: "Yau" });
    assert.deepEqual(canonicalLanguage("Sinhala, Sinhalese"), { key: "sinhala", label: "Sinhala" });
    assert.equal(canonicalLanguage("Farsi").key, canonicalLanguage("Persian").key);
  });

  it("groups editions that share a language", () => {
    const resources: TranslationResource[] = [
      { id: 1, name: "A", authorName: "", languageName: "Divehi", slug: "a" },
      { id: 2, name: "B", authorName: "", languageName: "Divehi, Dhivehi, Maldivian", slug: "b" },
      { id: 3, name: "C", authorName: "", languageName: "english", slug: "c" },
    ];
    const groups = groupLanguages(resources);
    const divehi = groups.find((group) => group.key === "divehi");
    assert.equal(divehi?.editions.length, 2);
    assert.equal(divehi?.label, "Divehi");
    assert.equal(scriptClass("urdu"), "script-nastaliq");
    assert.equal(scriptClass("Divehi"), "script-thaana");
    assert.equal(scriptClass("hebrew"), "script-hebrew");
  });
});

describe("footnotes", () => {
  it("removes superscript markers stuck to words", () => {
    assert.equal(stripHtml('Lord<sup foot_note="1">1</sup> of the worlds'), "Lord of the worlds");
    assert.equal(stripHtml("Mercy<sup>2</sup>."), "Mercy.");
  });
});

describe("tafsir excerpt", () => {
  it("cuts on a sentence instead of mid-word", () => {
    const text = `${"A calm sentence about the opening. ".repeat(20)}Then a tail that should wait.`;
    const excerpt = readableExcerpt(text, 400);
    assert.equal(excerpt.truncated, true);
    assert.match(excerpt.excerpt, /\.$/);
    assert.ok(excerpt.excerpt.length < text.length);
  });
});

describe("ranks", () => {
  it("caps a reader at one new ayah grant per day up to the daily room", () => {
    assert.equal(isRankVerseKey("67:1"), true);
    assert.equal(isRankVerseKey("999:1"), false);
    const keys = Array.from({ length: 80 }, (_, index) => `67:${index + 1}`);
    const applied = grantsToApply(0, keys, new Set());
    assert.equal(applied.length, RANK_DAY_CAP);
    const again = grantsToApply(RANK_DAY_CAP, keys, new Set(applied));
    assert.deepEqual(again, []);
  });
});

describe("rate limit", () => {
  it("blocks the next call after the window fills", () => {
    const key = `test-${Date.now()}`;
    assert.equal(rateLimit(key, 2, 60_000, 1_000).ok, true);
    assert.equal(rateLimit(key, 2, 60_000, 1_100).ok, true);
    const blocked = rateLimit(key, 2, 60_000, 1_200);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfter > 0);
    assert.equal(limitForPath("/api/auth/magic-link"), null);
    assert.equal(limitForPath("/api/quran/search")?.name, "search");
  });
});

describe("sana", () => {
  it("answers a plain question", () => {
    const match = matchHelper("play this surah");
    assert.equal(match.action, "play-surah");
    assert.ok(match.reply.length > 0);
    const unknown = matchHelper("what is a quiet morning");
    assert.equal(unknown.action, "none");
    assert.match(unknown.reply, /Sana/);
  });
});
