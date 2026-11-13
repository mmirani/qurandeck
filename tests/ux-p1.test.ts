import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "../src/lib/dialog-focus";
import { shouldStepAyahOnArrow } from "../src/lib/keyboard-target";
import { noteComposerReply, noteFieldIsVisible } from "../src/lib/note-composer";
import { searchStatusMessage } from "../src/lib/search-status";
import { matchHelper } from "../src/lib/guide/commands";
import { performHelper, type HelperHost } from "../src/lib/guide/perform";
import type { Verse } from "../src/lib/quran/types";

const home = readFileSync(new URL("../src/components/home/home-page.tsx", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../src/components/reader/verse-action-sheet.tsx", import.meta.url), "utf8");
const ayah = readFileSync(new URL("../src/components/reader/ayah-reader-mobile.tsx", import.meta.url), "utf8");
const mobileBar = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../src/components/search/search-bar.tsx", import.meta.url), "utf8");
const modal = readFileSync(new URL("../src/components/ui/modal.tsx", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/components/providers/mushaf-provider.tsx", import.meta.url), "utf8");

describe("P1 privacy line", () => {
  it("says personal tracking and links Private to the policy", () => {
    assert.match(home, /No ads or personal tracking/);
    assert.equal(home.includes("No ads or tracking<"), false);
    assert.match(home, /href="\/privacy"[\s\S]*Private/);
  });
});

describe("P1 note composer", () => {
  it("names Add note and Edit note on the ayah sheet", () => {
    assert.match(sheet, /Edit note/);
    assert.match(sheet, /Add note/);
    assert.equal(sheet.includes("Show tafsir & notes"), false);
    assert.match(sheet, /Show tafsir/);
  });

  it("labels the note with the ayah key and only claims the box is ready when focused", () => {
    assert.equal(noteComposerReply("67:17", true), "The note box for 67:17 is ready.");
    assert.equal(noteComposerReply("67:17", false), "Opening the note for 67:17.");
    assert.equal(noteFieldIsVisible({ width: 120, height: 40 }), true);
    assert.equal(noteFieldIsVisible({ width: 0, height: 40 }), false);
    assert.equal(noteFieldIsVisible(null), false);
  });

  it("keeps note text out of analytics", () => {
    const save = provider.slice(provider.indexOf("const saveNote"));
    assert.match(save, /feature: "note_added"/);
    assert.equal(save.includes("body:"), true);
    assert.equal(/trackUsage\([\s\S]{0,120}body/.test(save), false);
  });
});

describe("P1 ayah mode", () => {
  it("pins play, bookmark, note, and previous/next at 44px", () => {
    assert.match(ayah, /aria-label="Ayah actions"/);
    assert.match(ayah, /label="Play"/);
    assert.match(ayah, /Bookmark/);
    assert.match(ayah, /Add note/);
    assert.match(ayah, /aria-label="Previous ayah"/);
    assert.match(ayah, /aria-label="Next ayah"/);
    assert.match(ayah, /min-h-11 min-w-11/);
    assert.match(ayah, /shouldStepAyahOnArrow/);
  });
});

describe("P1 arrow keys", () => {
  it("ignores arrows from inputs, textareas, and contenteditable", () => {
    const input = { closest: () => input, isContentEditable: false } as unknown as HTMLElement;
    const area = { closest: () => null, isContentEditable: false, tagName: "TEXTAREA" } as unknown as HTMLElement;
    Object.defineProperty(area, "closest", { value: (selector: string) => (selector.includes("textarea") ? area : null) });
    const editable = { closest: () => null, isContentEditable: true } as unknown as HTMLElement;
    const button = { closest: () => null, isContentEditable: false } as unknown as HTMLElement;
    assert.equal(shouldStepAyahOnArrow(input), false);
    assert.equal(shouldStepAyahOnArrow(area), false);
    assert.equal(shouldStepAyahOnArrow(editable), false);
    assert.equal(shouldStepAyahOnArrow(button), true);
    assert.equal(shouldStepAyahOnArrow(null), true);
  });
});

describe("P1 phone search and empty results", () => {
  it("mounts the Quran search field on the phone bar", () => {
    assert.match(mobileBar, /<SearchBar \/>/);
    assert.match(search, /id="quran-search"/);
    assert.match(search, /h-12 w-full/);
  });

  it("says there are no matches after a finished empty search", () => {
    const prompt = searchStatusMessage({
      query: "mercy",
      submittedQuery: null,
      searching: false,
      resultCount: 0,
      nameHitCount: 0,
    });
    assert.equal(prompt, null);
    const empty = searchStatusMessage({
      query: "zzzznotaquranword",
      submittedQuery: "zzzznotaquranword",
      searching: false,
      resultCount: 0,
      nameHitCount: 0,
    });
    assert.match(empty ?? "", /No ayahs match/);
    assert.equal(empty?.includes("Press Enter"), false);
    assert.equal(
      searchStatusMessage({
        query: "mercy",
        submittedQuery: "mercy",
        searching: true,
        resultCount: 0,
        nameHitCount: 0,
      }),
      null,
    );
  });

  it("does not send the search words in the usage event", () => {
    const run = provider.slice(provider.indexOf("const runSearch"));
    assert.match(run, /feature: "search_performed"/);
    assert.equal(/trackUsage\(\{[^}]*query/.test(run), false);
  });
});

describe("P1 dialog focus", () => {
  it("moves into the dialog, traps tab, and restores focus on close", () => {
    assert.match(modal, /dialogFocusables/);
    assert.match(modal, /initialDialogIndex/);
    assert.match(modal, /trapTabIndex/);
    assert.match(modal, /previous\?\.focus\(\)/);
    assert.match(modal, /data-dialog-close/);
    assert.equal(initialDialogIndex(4, 0), 1);
    assert.equal(initialDialogIndex(1, 0), 0);
    assert.equal(trapTabIndex(3, 4, false), 0);
    assert.equal(trapTabIndex(0, 4, true), 3);
    assert.equal(trapTabIndex(-1, 4, false), 0);
    const root = {
      querySelectorAll: () => [
        { tabIndex: 0, getAttribute: (name: string) => (name === "aria-hidden" ? null : null) },
        { tabIndex: -1, getAttribute: () => null },
      ],
    } as unknown as ParentNode;
    assert.equal(dialogFocusables(root).length, 1);
  });
});

describe("P1 Sana note reply", () => {
  it("says the box is ready only when focus landed", () => {
    const verse = {
      id: 1,
      chapterId: 1,
      verseNumber: 1,
      verseKey: "1:1",
      juzNumber: 1,
      hizbNumber: 1,
      pageNumber: 1,
      textUthmani: "",
      translation: "",
      translations: [],
      transliteration: "",
      words: [],
      audioUrl: null,
    } satisfies Verse;
    const host = {
      verses: [verse],
      chapterId: 1,
      mode: "surah",
      currentJuz: 1,
      selectedVerseKey: "1:1",
      selectedWord: null,
      isPlaying: false,
      fontSize: 18,
      focusMode: false,
      showTafsir: false,
      showTransliteration: false,
      translationIds: [131],
      signedIn: false,
      notes: [],
      bookmarks: [],
      translations: [],
      recitations: [],
      versesRead: 0,
      surahsFinished: 0,
      streak: 0,
      openSurah: () => undefined,
      openJuz: () => undefined,
      selectVerse: () => undefined,
      playFrom: () => undefined,
      playVerse: () => undefined,
      playWord: () => undefined,
      togglePlay: () => undefined,
      updatePreferences: () => undefined,
      openModal: () => undefined,
      toggleBookmark: () => undefined,
      highlightAyah: () => undefined,
      clearHighlights: () => undefined,
      saveNote: () => undefined,
      runSearch: () => undefined,
      focusSearch: () => undefined,
      focusNote: () => false,
      openStudy: () => undefined,
      startWelcome: () => undefined,
      startLesson: () => undefined,
      rest: () => undefined,
      download: () => undefined,
      schedule: () => undefined,
      reveal: () => undefined,
    } satisfies HelperHost;
    const hidden = performHelper(matchHelper("add a note"), host);
    assert.equal(hidden, "Opening the note for 1:1.");
    const shown = performHelper(matchHelper("add a note"), { ...host, focusNote: () => true });
    assert.equal(shown, "The note box for 1:1 is ready.");
  });
});
