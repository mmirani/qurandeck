import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchHelper, matchReciter } from "../src/lib/guide/commands";
import { SURAH_NAMES, surahVerseCount } from "../src/lib/guide/surahs";

describe("Sana command parser", () => {
  it("lists 114 surahs with verse counts", () => {
    assert.equal(SURAH_NAMES.length, 114);
    assert.equal(surahVerseCount(1), 7);
    assert.equal(surahVerseCount(2), 286);
    assert.equal(surahVerseCount(114), 6);
  });

  it("opens verse keys, transliterated names, and juz", () => {
    assert.equal(matchHelper("go to 2:255").action, "go-verse");
    assert.equal(matchHelper("go to 2:255").verseKey, "2:255");
    assert.equal(matchHelper("2.255").verseKey, "2:255");
    assert.equal(matchHelper("2/255").verseKey, "2:255");
    assert.equal(matchHelper("surah 2 ayah 255").verseKey, "2:255");
    assert.equal(matchHelper("baqarah 255").verseKey, "2:255");
    assert.equal(matchHelper("al-baqarah ayah 255").chapterId, 2);
    assert.equal(matchHelper("yaseen").action, "go-surah");
    assert.equal(matchHelper("ya-sin").chapterId, 36);
    assert.equal(matchHelper("the cave").chapterId, 18);
    assert.equal(matchHelper("juz 30").action, "go-juz");
    assert.equal(matchHelper("para 5").juz, 5);
    assert.equal(matchHelper("ayat al kursi").verseKey, "2:255");
  });

  it("rejects an ayah number the surah does not have", () => {
    const match = matchHelper("baqarah 300");
    assert.equal(match.action, "none");
    assert.match(match.reply, /286/);
  });

  it("plays, pauses, and names a reciter", () => {
    assert.equal(matchHelper("play this surah").action, "play-surah");
    assert.equal(matchHelper("plaay this surah").action, "play-surah");
    assert.equal(matchHelper("play yasin").action, "play-surah");
    assert.equal(matchHelper("play yasin").chapterId, 36);
    assert.equal(matchHelper("play this ayah").action, "play-ayah");
    assert.equal(matchHelper("play 2:255").autoplay, "verse");
    assert.equal(matchHelper("rest of the surah").action, "play-from");
    assert.equal(matchHelper("play this word").action, "play-word");
    assert.equal(matchHelper("pause").action, "pause");
    assert.equal(matchHelper("resume").action, "resume");
    const reciter = matchHelper("change reciter to sudais");
    assert.equal(reciter.action, "reciter");
    assert.match(reciter.reciter ?? "", /sudais/);
    const picked = matchReciter("mishari", [
      { id: 7, reciterName: "Mishari Rashid al-Afasy" },
      { id: 3, reciterName: "Abdur-Rahman as-Sudais" },
    ]);
    assert.equal(picked?.id, 7);
  });

  it("moves between ayahs, surahs, and reading layouts", () => {
    assert.equal(matchHelper("next ayah").action, "next");
    assert.equal(matchHelper("next ayah").target, "ayah");
    assert.equal(matchHelper("previous surah").action, "previous");
    assert.equal(matchHelper("previous surah").target, "surah");
    assert.equal(matchHelper("next juz").target, "juz");
    assert.equal(matchHelper("go back").action, "previous");
    assert.equal(matchHelper("ayah mode").readingMode, "ayah");
    assert.equal(matchHelper("scroll mode").readingMode, "scroll");
    assert.equal(matchHelper("one ayah at a time").readingMode, "ayah");
  });

  it("covers notes, bookmarks, highlights, search, tafsir, and type", () => {
    const note = matchHelper("add a note saying remember the opening");
    assert.equal(note.action, "note");
    assert.match(note.noteBody ?? "", /remember the opening/);
    assert.equal(matchHelper("show my notes").action, "find-notes");
    assert.equal(matchHelper("find notes about mercy").query, "mercy");
    assert.equal(matchHelper("bookmark this ayah").action, "bookmark");
    assert.equal(matchHelper("bookmakr this ayah").action, "bookmark");
    assert.equal(matchHelper("favourite this").action, "bookmark");
    assert.equal(matchHelper("show bookmarks").action, "bookmarks");
    assert.equal(matchHelper("highlight this ayah").action, "highlight");
    assert.equal(matchHelper("highlite this").action, "highlight");
    assert.equal(matchHelper("clear highlight").action, "clear-highlight");
    assert.equal(matchHelper("show highlights").action, "highlights");
    assert.equal(matchHelper("search for mercy").action, "search");
    assert.equal(matchHelper("search for mercy").query, "mercy");
    assert.equal(matchHelper("serch mercy").query, "mercy");
    assert.equal(matchHelper("where is search").locate, true);
    assert.equal(matchHelper("open tafsir").action, "tafsir");
    assert.equal(matchHelper("tafsir for 18:1").verseKey, "18:1");
    assert.equal(matchHelper("hide tafsir").query, "hide");
    assert.equal(matchHelper("bigger").action, "bigger");
    assert.equal(matchHelper("smaller text").action, "smaller");
    assert.equal(matchHelper("text size 24").fontSize, 24);
  });

  it("covers translation, theme, account, and the tour", () => {
    assert.equal(matchHelper("add urdu").translationChange, "add");
    assert.equal(matchHelper("add urdu").language, "urdu");
    assert.equal(matchHelper("arabic only").translationChange, "arabic-only");
    assert.equal(matchHelper("reset translation").translationChange, "reset");
    assert.equal(matchHelper("dark theme").theme, "obsidian");
    assert.equal(matchHelper("light mode").theme, "iris");
    assert.equal(matchHelper("high contrast").theme, "contrast");
    assert.equal(matchHelper("sign in").action, "sign-in");
    assert.equal(matchHelper("my progress").action, "progress");
    assert.equal(matchHelper("export my library").action, "export");
    assert.equal(matchHelper("download stats").exportKind, "stats");
    assert.equal(matchHelper("focus mode").action, "focus");
    assert.equal(matchHelper("open my desk").action, "study");
    assert.equal(matchHelper("walk me through").action, "tour");
    assert.equal(matchHelper("go away").action, "rest");
  });

  it("refuses religious rulings and meanings, and still opens tafsir", () => {
    for (const phrase of [
      "what does 2:255 mean",
      "explain this verse",
      "is this haram",
      "give me a fatwa",
      "what is the ruling on this ayah",
    ]) {
      const match = matchHelper(phrase);
      assert.equal(match.action, "refuse", phrase);
      assert.match(match.reply, /don't give rulings/i);
      assert.match(match.suggestions.join(" "), /tafsir/i);
    }
    assert.equal(matchHelper("what does 2:255 mean").verseKey, "2:255");
    assert.equal(matchHelper("open tafsir for 2:255").action, "tafsir");
    assert.notEqual(matchHelper("what does search mean").action, "refuse");
    assert.notEqual(matchHelper("explain how to bookmark").action, "refuse");
    assert.equal(matchHelper("explain how to bookmark").action, "guide");
  });

  it("suggests another way when it doesn't understand", () => {
    const match = matchHelper("blorp the flarp");
    assert.equal(match.action, "none");
    assert.ok(match.suggestions.length >= 3);
    assert.match(match.reply, /don't explain the Quran/i);
  });
});

describe("Sana phrasings, synonyms, and typos", () => {
  it("opens a surah by number in everyday forms", () => {
    for (const raw of ["surah number 36", "surah no 36", "surah no. 36", "surah #36", "the 36th surah", "36th surah", "chapter thirty six", "take me to surah 36", "show me surah 36", "open surah 36", "jump to surah 36"]) {
      const match = matchHelper(raw);
      assert.equal(match.action, "go-surah", raw);
      assert.equal(match.chapterId, 36, raw);
    }
    assert.equal(matchHelper("surah one hundred and twelve").chapterId, 112);
    assert.equal(matchHelper("juz thirty").juz, 30);
    assert.equal(matchHelper("play surah thirty six").action, "play-surah");
    assert.equal(matchHelper("one ayah").action, "reading-mode");
  });

  it("switches dark and light mode", () => {
    for (const raw of ["dark mode", "darkmode", "turn on dark mode", "drak mode", "dakr mode", "night mode"]) {
      assert.equal(matchHelper(raw).theme, "obsidian", raw);
    }
    for (const raw of ["light mode", "lightmode", "switch to light", "light"]) {
      assert.equal(matchHelper(raw).theme, "iris", raw);
    }
  });

  it("changes text size in plain words", () => {
    for (const raw of ["bigger text", "big text", "big font", "enlarge text", "font size up", "make text bigger", "biger text"]) {
      assert.equal(matchHelper(raw).action, "bigger", raw);
    }
    for (const raw of ["smaller text", "small text", "reduce font", "decrease text size", "shrink text", "text size down"]) {
      assert.equal(matchHelper(raw).action, "smaller", raw);
    }
  });

  it("understands other common phrasings", () => {
    assert.equal(matchHelper("save this ayah").action, "bookmark");
    assert.equal(matchHelper("shwo bookmarks").action, "bookmarks");
    assert.equal(matchHelper("mute").action, "pause");
    assert.equal(matchHelper("back").action, "previous");
    assert.equal(matchHelper("previous page").action, "previous");
    assert.equal(matchHelper("nxt ayah").action, "next");
    assert.equal(matchHelper("serach mercy").action, "search");
    assert.equal(matchHelper("translation off").translationChange, "arabic-only");
    assert.equal(matchHelper("turn off translation").translationChange, "arabic-only");
    assert.equal(matchHelper("log out").action, "account");
    assert.equal(matchHelper("sign out").action, "account");
    assert.equal(matchHelper("log in").action, "sign-in");
    assert.equal(matchHelper("my stats").action, "progress");
    assert.equal(matchHelper("export stats").exportKind, "stats");
    assert.equal(matchHelper("fullscreen").action, "focus");
  });

  it("answers help and greetings as a site helper, not a surah", () => {
    for (const raw of ["help", "what can you do", "commands"]) {
      const match = matchHelper(raw);
      assert.equal(match.action, "guide", raw);
      assert.doesNotMatch(match.reply, /\bAI\b|assistant|model/i);
    }
    const salam = matchHelper("salam");
    assert.equal(salam.action, "guide");
    assert.equal(salam.chapterId, undefined);
    assert.equal(matchHelper("assalamu alaikum").action, "guide");
    assert.equal(matchHelper("thanks").action, "guide");
  });

  it("still refuses rulings after the new phrasings", () => {
    assert.equal(matchHelper("is music haram").action, "refuse");
    assert.equal(matchHelper("explain this ayah").action, "refuse");
  });
});
