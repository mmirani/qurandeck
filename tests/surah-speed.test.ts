import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FIRST_SCREEN_AYAHS, mergeVerses, requestedAyahNumber, seedMatchesReading, type SurahSeed } from "../src/lib/quran/surah-seed";
import type { Chapter, Verse } from "../src/lib/quran/types";

const provider = readFileSync(new URL("../src/components/providers/mushaf-provider.tsx", import.meta.url), "utf8");
const sync = readFileSync(new URL("../src/components/reader/reading-seed.tsx", import.meta.url), "utf8");
const seedSource = readFileSync(new URL("../src/lib/quran/surah-seed.ts", import.meta.url), "utf8");

function chapter(versesCount: number): Chapter {
  return {
    id: 2,
    nameSimple: "Al-Baqarah",
    nameArabic: "البقرة",
    translatedName: "The Cow",
    versesCount,
    revelationPlace: "madinah",
    revelationOrder: 87,
    bismillahPre: true,
    pages: [2, 49],
  };
}

function verse(number: number): Verse {
  return {
    id: number,
    chapterId: 2,
    verseNumber: number,
    verseKey: `2:${number}`,
    juzNumber: 1,
    hizbNumber: 1,
    pageNumber: 2,
    textUthmani: "ayah",
    translation: "ayah",
    translations: [],
    transliteration: "",
    words: [],
    audioUrl: null,
  };
}

function seed(partial: boolean): SurahSeed {
  return {
    chapter: chapter(286),
    verses: [verse(1), verse(2)],
    introduction: "",
    introductionSource: "",
    translationKey: "20",
    partial,
  };
}

describe("surah first paint", () => {
  it("reads a deep link from the hash or the ayah query", () => {
    assert.equal(requestedAyahNumber("#ayah-255", null), 255);
    assert.equal(requestedAyahNumber("#255", null), 255);
    assert.equal(requestedAyahNumber("", "255"), 255);
    assert.equal(requestedAyahNumber("#ayah-255", "10"), 10);
    assert.equal(requestedAyahNumber("#nope", null), undefined);
    assert.equal(requestedAyahNumber("#0", null), undefined);
  });

  it("reuses the seed only when the surah and translations match", () => {
    assert.equal(seedMatchesReading(seed(false), 2, [20]), true);
    assert.equal(seedMatchesReading(seed(false), 2, [20, 19]), false);
    assert.equal(seedMatchesReading(seed(false), 3, [20]), false);
    assert.equal(seedMatchesReading(null, 2, [20]), false);
  });

  it("appends the rest of a surah without duplicating the opening ayahs", () => {
    const merged = mergeVerses([verse(1), verse(2)], [verse(2), verse(3)]);
    assert.deepEqual(merged.map((item) => item.verseNumber), [1, 2, 3]);
    assert.equal(mergeVerses([verse(1)], [verse(1)]).length, 1);
  });

  it("ships the opening screen in the document and fills a long surah afterwards", () => {
    assert.equal(FIRST_SCREEN_AYAHS, 20);
    assert.match(seedSource, /fetchVersePage/);
    assert.match(seedSource, /partial: verses\.length < chapter\.versesCount/);
    assert.match(sync, /seedMatchesReading/);
    assert.match(sync, /getSurah\(/);
    assert.match(sync, /seed\.partial/);
    assert.match(provider, /if \(surahMatch \|\| pathname === "\/read"\) return/);
    assert.match(provider, /adoptSurahSeed/);
    assert.equal(provider.includes("void loadSurah(Number(surahMatch[1])"), false);
  });
});
