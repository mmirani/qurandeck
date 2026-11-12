import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { canonicalLanguage, groupLanguages, readingDefaults, toggleLanguage } from "@/lib/quran/languages";
import type { AppearanceThemeId, Verse, Word } from "@/lib/quran/types";
import type { HelperMatch } from "./commands";
import { matchReciter } from "./commands";
import { noteComposerReply } from "@/lib/note-composer";
import { surahById } from "./surahs";

export type PendingKind =
  | "play-verse"
  | "play-from"
  | "play-first"
  | "bookmark"
  | "highlight"
  | "clear-highlight"
  | "tafsir"
  | "focus-note"
  | "save-note";

export type PendingJob = { verseKey: string; kind: PendingKind; noteBody?: string };

export type HelperHost = {
  verses: Verse[];
  chapterId: number | null;
  mode: "surah" | "juz";
  currentJuz: number | null;
  selectedVerseKey: string | null;
  selectedWord: Word | null;
  isPlaying: boolean;
  fontSize: number;
  focusMode: boolean;
  showTafsir: boolean;
  showTransliteration: boolean;
  translationIds: number[];
  signedIn: boolean;
  notes: { verseKey: string; body: string }[];
  bookmarks: { type: string; verseKey: string }[];
  translations: { id: number; languageName: string }[];
  recitations: { id: number; reciterName: string }[];
  versesRead: number;
  surahsFinished: number;
  streak: number;
  openSurah: (id: number, verse?: number) => void;
  openJuz: (n: number) => void;
  selectVerse: (key: string) => void;
  playFrom: (key: string) => void;
  playVerse: (key: string) => void;
  playWord: (word: Word) => void;
  togglePlay: () => void;
  updatePreferences: (partial: {
    fontSize?: number;
    theme?: AppearanceThemeId;
    focusMode?: boolean;
    showStudyRail?: boolean;
    showNavRail?: boolean;
    showTafsir?: boolean;
    showArabic?: boolean;
    showTranslation?: boolean;
    showTransliteration?: boolean;
    showWordByWord?: boolean;
    translationId?: number;
    translationIds?: number[];
    recitationId?: number;
    mobileReadingMode?: "scroll" | "ayah";
    traditionalPage?: boolean;
  }) => void;
  openModal: (name: "auth" | "account" | "bookmarks" | "notes" | "highlights" | "themes" | "settings" | "juz") => void;
  toggleBookmark: (verse: Verse) => void;
  highlightAyah: (verse: Verse) => void;
  clearHighlights: (verseKey: string) => void;
  saveNote: (verseKey: string, body: string) => void;
  runSearch: (query: string) => void;
  focusSearch: () => void;
  focusNote: (verseKey: string) => boolean;
  openStudy: () => void;
  startWelcome: () => void;
  startLesson: (id: "welcome" | "search" | "languages" | "ayah" | "audio" | "size" | "study" | "account") => void;
  rest: () => void;
  download: (kind: "stats" | "library") => void;
  schedule: (job: PendingJob) => void;
  reveal: (verseNumber: number) => void;
};

function verseAt(host: HelperHost, key: string | undefined) {
  if (!key) return null;
  return host.verses.find((item) => item.verseKey === key) ?? null;
}

function currentKey(host: HelperHost, match: HelperMatch) {
  return match.verseKey ?? host.selectedVerseKey ?? host.verses[0]?.verseKey ?? null;
}

function ensureVerse(host: HelperHost, match: HelperMatch, kind: PendingKind) {
  const key = currentKey(host, match);
  if (!key) return null;
  const verse = verseAt(host, key);
  if (verse) return verse;
  const [chapterId, verseNumber] = key.split(":").map(Number);
  if (!chapterId || !verseNumber) return null;
  host.openSurah(chapterId, verseNumber);
  host.schedule({ verseKey: key, kind });
  return null;
}

function nameOf(chapterId: number | null | undefined) {
  if (!chapterId) return "this surah";
  return surahById(chapterId)?.name ?? `Surah ${chapterId}`;
}

export function performHelper(match: HelperMatch, host: HelperHost): string {
  switch (match.action) {
    case "none":
    case "refuse":
    case "guide":
      return match.reply;
    case "tour":
      host.startWelcome();
      return match.reply;
    case "lesson":
      if (match.lesson) host.startLesson(match.lesson);
      return match.reply;
    case "rest":
      host.rest();
      return match.reply;
    case "pause":
      if (!host.isPlaying) return "Nothing is playing.";
      host.togglePlay();
      return "Paused.";
    case "resume":
      if (host.isPlaying) return "It's already playing.";
      host.togglePlay();
      return "Playing.";
    case "play-word": {
      if (!host.selectedWord) {
        host.updatePreferences({ showWordByWord: true, showStudyRail: true, focusMode: false });
        host.openStudy();
        return "Tap a word in the ayah first. I opened word by word on the study desk.";
      }
      host.playWord(host.selectedWord);
      return "Playing this word.";
    }
    case "play-ayah": {
      const verse = ensureVerse(host, match, "play-verse");
      if (!verse) return match.verseKey ? `Opening ${match.verseKey} and playing it.` : "No ayah is open yet.";
      host.selectVerse(verse.verseKey);
      host.playVerse(verse.verseKey);
      host.reveal(verse.verseNumber);
      return `Playing ${verse.verseKey}.`;
    }
    case "play-from": {
      const verse = ensureVerse(host, match, "play-from");
      if (!verse) return match.verseKey ? `Opening ${match.verseKey} and playing from there.` : "Pick an ayah and I'll play from there.";
      host.selectVerse(verse.verseKey);
      host.playFrom(verse.verseKey);
      host.reveal(verse.verseNumber);
      return `Playing from ${verse.verseKey} through the rest.`;
    }
    case "play-surah": {
      const chapterId = match.chapterId ?? host.chapterId ?? host.verses[0]?.chapterId ?? null;
      if (!chapterId) return "Open a surah first, then I can play it.";
      const first = host.verses.find((item) => item.chapterId === chapterId) ?? host.verses[0];
      if (first && first.chapterId === chapterId && host.chapterId === chapterId) {
        const start = host.verses.find((item) => item.chapterId === chapterId);
        if (!start) return `I couldn't find audio for ${nameOf(chapterId)}.`;
        host.playFrom(start.verseKey);
        return `Playing ${nameOf(chapterId)} from the start.`;
      }
      host.openSurah(chapterId, 1);
      host.schedule({ verseKey: `${chapterId}:1`, kind: "play-from" });
      return `Opening ${nameOf(chapterId)} and playing from the start.`;
    }
    case "reciter": {
      if (!match.reciter) {
        host.openModal("settings");
        return "Reciters are in reading settings, and on the player.";
      }
      const found = matchReciter(match.reciter, host.recitations);
      if (!found) {
        host.openModal("settings");
        return `I couldn't find a reciter matching “${match.reciter}”. I opened the list.`;
      }
      host.updatePreferences({ recitationId: found.id });
      return `Reciter is now ${found.reciterName}.`;
    }
    case "go-verse": {
      if (!match.chapterId || !match.verseNumber || !match.verseKey) return match.reply;
      const loaded = verseAt(host, match.verseKey);
      if (!loaded || host.chapterId !== match.chapterId) host.openSurah(match.chapterId, match.verseNumber);
      host.selectVerse(match.verseKey);
      host.reveal(match.verseNumber);
      if (match.autoplay === "verse") {
        if (loaded && host.chapterId === match.chapterId) host.playVerse(match.verseKey);
        else host.schedule({ verseKey: match.verseKey, kind: "play-verse" });
      } else if (match.autoplay === "from") {
        if (loaded && host.chapterId === match.chapterId) host.playFrom(match.verseKey);
        else host.schedule({ verseKey: match.verseKey, kind: "play-from" });
      }
      return match.reply;
    }
    case "go-surah": {
      if (!match.chapterId) return match.reply;
      host.openSurah(match.chapterId);
      if (match.autoplay === "surah") host.schedule({ verseKey: `${match.chapterId}:1`, kind: "play-from" });
      return match.reply;
    }
    case "go-juz": {
      if (!match.juz) return match.reply;
      host.openJuz(match.juz);
      if (match.autoplay) host.schedule({ verseKey: "", kind: "play-first" });
      return match.reply;
    }
    case "next":
    case "previous":
      return step(host, match.action, match.target ?? "ayah");
    case "reading-mode": {
      const mode = match.readingMode ?? "scroll";
      host.updatePreferences({ mobileReadingMode: mode, ...(mode === "ayah" ? { traditionalPage: false } : {}) });
      return mode === "ayah"
        ? "One ayah at a time is on for the phone layout. On a wide screen the mushaf stays in scroll."
        : "Continuous scroll is on.";
    }
    case "note": {
      const verse = ensureVerse(host, match, "focus-note");
      const key = match.verseKey ?? verse?.verseKey ?? host.selectedVerseKey;
      if (!key) return "Open an ayah first, then I can attach a note.";
      if (match.noteBody) {
        if (!verse) {
          host.schedule({ verseKey: key, kind: "save-note", noteBody: match.noteBody });
          return `I'll save that note on ${key} once it opens.`;
        }
        host.saveNote(key, match.noteBody);
        host.selectVerse(key);
        return `Saved a note on ${key}.`;
      }
      if (verse) {
        host.selectVerse(verse.verseKey);
        const focused = host.focusNote(verse.verseKey);
        return noteComposerReply(key, focused);
      }
      return noteComposerReply(key, false);
    }
    case "find-notes": {
      host.openModal("notes");
      const query = match.query?.toLowerCase();
      if (!query) {
        return host.notes.length === 0 ? "You don't have any notes yet. I can add one on this ayah." : `You have ${host.notes.length} note${host.notes.length === 1 ? "" : "s"}.`;
      }
      const found = host.notes.filter((note) => note.body.toLowerCase().includes(query) || note.verseKey.includes(query));
      const first = found[0];
      if (!first) return `No note mentions “${match.query}”.`;
      const [chapterId, verseNumber] = first.verseKey.split(":").map(Number);
      host.openSurah(chapterId, verseNumber);
      host.selectVerse(first.verseKey);
      return found.length === 1
        ? `Found a note on ${first.verseKey}.`
        : `Found ${found.length} notes. Opening ${first.verseKey}.`;
    }
    case "bookmark": {
      const verse = ensureVerse(host, match, "bookmark");
      const key = match.verseKey ?? verse?.verseKey ?? host.selectedVerseKey;
      if (!key) return "Open an ayah first, then I can bookmark it.";
      if (!verse) return `I'll bookmark ${key} once it opens.`;
      const had = host.bookmarks.some((item) => item.type === "verse" && item.verseKey === verse.verseKey);
      host.toggleBookmark(verse);
      host.selectVerse(verse.verseKey);
      return had ? `Removed the bookmark on ${verse.verseKey}.` : `Bookmarked ${verse.verseKey}.`;
    }
    case "bookmarks":
      host.openModal("bookmarks");
      return host.bookmarks.length === 0 ? "No bookmarks yet. Star an ayah, or ask me to bookmark this one." : "Here are your bookmarks.";
    case "highlight": {
      const verse = ensureVerse(host, match, "highlight");
      if (!verse) return match.verseKey ? `I'll highlight ${match.verseKey} once it opens.` : "Open an ayah first, then I can highlight it.";
      host.highlightAyah(verse);
      host.selectVerse(verse.verseKey);
      return `Highlighted ${verse.verseKey}.`;
    }
    case "clear-highlight": {
      const verse = ensureVerse(host, match, "clear-highlight");
      const key = match.verseKey ?? verse?.verseKey ?? host.selectedVerseKey;
      if (!key) return "Open an ayah first.";
      if (!verse) return `I'll clear the highlight on ${key} once it opens.`;
      host.clearHighlights(key);
      return `Cleared highlights on ${key}.`;
    }
    case "highlights":
      host.openModal("highlights");
      return "Here are your highlights.";
    case "search":
      if (match.locate || !match.query) {
        host.focusSearch();
        host.startLesson("search");
        return match.reply;
      }
      host.runSearch(match.query);
      return `Searching for “${match.query}”.`;
    case "translation":
      return applyTranslation(host, match);
    case "tafsir": {
      if (match.query === "hide") {
        host.updatePreferences({ showTafsir: false });
        return "Tafsir is hidden.";
      }
      const verse = ensureVerse(host, match, "tafsir");
      const key = match.verseKey ?? verse?.verseKey ?? host.selectedVerseKey;
      host.updatePreferences({ showTafsir: true });
      if (verse) {
        host.selectVerse(verse.verseKey);
        host.reveal(verse.verseNumber);
      }
      return key ? `Tafsir is open for ${key}. I don't summarize it.` : "Tafsir is open. I don't summarize it.";
    }
    case "bigger": {
      const next = Math.min(FONT_SIZE_MAX, host.fontSize + 2);
      host.updatePreferences({ fontSize: next });
      return next === host.fontSize ? "That's as large as the type goes." : "A little larger.";
    }
    case "smaller": {
      const next = Math.max(FONT_SIZE_MIN, host.fontSize - 2);
      host.updatePreferences({ fontSize: next });
      return next === host.fontSize ? "That's as small as the type goes." : "A little smaller.";
    }
    case "font-size": {
      const size = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, match.fontSize ?? host.fontSize));
      host.updatePreferences({ fontSize: size });
      return `Reading size is ${size}.`;
    }
    case "theme": {
      if (!match.theme || match.openThemePicker) {
        host.openModal("themes");
        return "Opening themes.";
      }
      host.updatePreferences({ theme: match.theme });
      const name = APPEARANCE_THEMES.find((item) => item.id === match.theme)?.name ?? match.theme;
      return `Theme is ${name}.`;
    }
    case "sign-in":
      host.openModal(host.signedIn ? "account" : "auth");
      return host.signedIn ? "You're signed in. I opened your account." : "Sign in is open. It's free, and your library syncs with the account.";
    case "account":
      host.openModal(host.signedIn ? "account" : "auth");
      return host.signedIn ? "Here's your account." : "Sign in to keep a named profile. You can still read and save on this device.";
    case "progress":
      host.openModal(host.signedIn ? "account" : "auth");
      return `On this device: ${host.versesRead} ayahs marked, ${host.surahsFinished} surahs finished, streak ${host.streak} day${host.streak === 1 ? "" : "s"}. ${
        host.signedIn ? "Your account is open." : "Sign in when you want this to sync."
      }`;
    case "export":
      host.download(match.exportKind ?? "library");
      host.openModal(host.signedIn ? "account" : "account");
      return match.exportKind === "stats" ? "Your stats spreadsheet is downloading." : "Your library file is downloading.";
    case "study":
      host.updatePreferences({
        showStudyRail: true,
        focusMode: false,
        ...(match.wordByWord ? { showWordByWord: true } : {}),
      });
      host.openStudy();
      if (match.lesson) host.startLesson(match.lesson);
      return match.reply;
    case "focus":
      host.updatePreferences({ focusMode: !host.focusMode ? true : false });
      return host.focusMode ? "Leaving focus." : "Focus is on. The extra controls step back.";
    default:
      return match.reply;
  }
}

function step(host: HelperHost, direction: "next" | "previous", target: "ayah" | "surah" | "juz"): string {
  const delta = direction === "next" ? 1 : -1;
  if (target === "juz") {
    const selected = host.verses.find((item) => item.verseKey === host.selectedVerseKey) ?? host.verses[0];
    const here = host.mode === "juz" ? (host.currentJuz ?? 1) : (selected?.juzNumber ?? host.currentJuz ?? 1);
    const value = here + delta;
    if (value < 1 || value > 30) return direction === "next" ? "That's the last juz." : "That's the first juz.";
    host.openJuz(value);
    return `Opening Juz ${value}.`;
  }
  if (target === "surah") {
    const id = (host.chapterId ?? 1) + delta;
    if (id < 1 || id > 114) return direction === "next" ? "That's the last surah." : "That's the first surah.";
    host.openSurah(id);
    return `Opening ${nameOf(id)}.`;
  }
  const key = host.selectedVerseKey ?? host.verses[0]?.verseKey ?? null;
  const index = host.verses.findIndex((item) => item.verseKey === key);
  const neighbor = host.verses[index + delta];
  if (neighbor) {
    host.selectVerse(neighbor.verseKey);
    host.reveal(neighbor.verseNumber);
    return direction === "next" ? `Ayah ${neighbor.verseKey}.` : `Ayah ${neighbor.verseKey}.`;
  }
  const chapterId = host.chapterId ?? host.verses[0]?.chapterId ?? 1;
  const nextChapter = chapterId + delta;
  if (nextChapter < 1 || nextChapter > 114) return direction === "next" ? "That's the last ayah." : "That's the first ayah.";
  host.openSurah(nextChapter, direction === "next" ? 1 : undefined);
  return `Opening ${nameOf(nextChapter)}.`;
}

function applyTranslation(host: HelperHost, match: HelperMatch) {
  if (match.translationChange === "reset") {
    host.updatePreferences(readingDefaults());
    return "Back to Arabic and English.";
  }
  if (match.translationChange === "arabic-only") {
    host.updatePreferences({ showArabic: true, showTranslation: false, showTransliteration: false });
    return "Arabic is on by itself.";
  }
  if (match.translationChange === "transliteration") {
    host.updatePreferences({ showTransliteration: !host.showTransliteration });
    return host.showTransliteration ? "Transliteration is off." : "Transliteration is on.";
  }
  if (match.translationChange === "show") {
    host.updatePreferences({ showTranslation: true, showArabic: true });
    return "Translation is on beside the Arabic.";
  }
  const wanted = match.language;
  if (!wanted) {
    host.startLesson("languages");
    return "Arabic stays. Ask me to add a language, such as Urdu, or to reset to Arabic and English.";
  }
  if (host.translations.length === 0) {
    host.startLesson("languages");
    return "Translations are still loading. The language chips sit with the surah title.";
  }
  const groups = groupLanguages(
    host.translations.map((item) => ({
      id: item.id,
      name: item.languageName,
      authorName: "",
      languageName: item.languageName,
      slug: String(item.id),
    })),
  );
  const key = canonicalLanguage(wanted).key;
  const group = groups.find((item) => item.key === key || item.label.toLowerCase() === wanted);
  if (!group) return `I don't see ${wanted} in the loaded translations yet.`;
  const already = host.translationIds.some((id) => group.editions.some((edition) => edition.id === id));
  if (match.translationChange === "hide") {
    if (!already) return `${group.label} isn't on.`;
    const without = host.translationIds.filter((id) => !group.editions.some((edition) => edition.id === id));
    host.updatePreferences({ translationIds: without, showTranslation: without.length > 0 });
    return `Hid ${group.label}.`;
  }
  if (already) return `${group.label} is already on.`;
  const ids = toggleLanguage(host.translationIds, group);
  if (ids.length === host.translationIds.length) return "That's as many translations as the page can show. Hide one first.";
  host.updatePreferences({ translationIds: ids, showTranslation: true, showArabic: true });
  return `Added ${group.label} beside the Arabic.`;
}
