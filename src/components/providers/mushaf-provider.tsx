"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getAudioMap,
  getChapters,
  getJuz,
  getJuzs,
  getRecitations,
  getSurah,
  getTranslations,
  searchQuran,
} from "@/lib/quran/client";
import { withTranslationIds } from "@/lib/quran/languages";
import { mergeStudyCards } from "@/lib/study-cards";
import { TOPICS } from "@/lib/quran/theme-topics";
import type {
  Bookmark,
  Chapter,
  Highlight,
  HighlightLayer,
  HighlightSwatch,
  Juz,
  ModalName,
  Note,
  Preferences,
  RecitationResource,
  SearchFilters,
  SearchHit,
  SessionUser,
  TranslationResource,
  UserAccount,
  Verse,
  Word,
} from "@/lib/quran/types";
import {
  defaultPreferences,
  hashPassword,
  loadBookmarks,
  loadHighlights,
  loadNotes,
  loadPreferences,
  loadProgress,
  loadSession,
  loadSwatches,
  loadUsers,
  saveBookmarks,
  saveHighlights,
  saveNotes,
  savePreferences,
  saveProgress,
  saveSession,
  saveSwatches,
  saveUsers,
} from "@/lib/storage";
import { layoutSignals, appliedTheme } from "@/lib/appearance";
import {
  addReadingSeconds,
  defaultReadingProgress,
  isResumeDue,
  markSurahRead,
  markVerseRead,
  RESUME_AFTER_MS,
  saveReadingPlace,
} from "@/lib/reading";
import type { ReadingProgress } from "@/lib/reading";
import {
  addTextHighlight,
  DEFAULT_SWATCH_ID,
  defaultSwatches,
  paintArabicRange,
  clearVerseHighlights as dropVerseHighlights,
  removeHighlight,
  removeHighlights,
  toggleAyahHighlight,
  toggleArabicWord,
} from "@/lib/highlights";
import { wordByWordAudioUrl } from "@/lib/quran/sources";
import { requestWelcomeTour } from "@/lib/guide/progress";

type PlayMode = "idle" | "word" | "verse" | "from-here";

type MushafContextValue = {
  preferences: Preferences;
  updatePreferences: (partial: Partial<Preferences>) => void;
  chapters: Chapter[];
  juzs: Juz[];
  translations: TranslationResource[];
  recitations: RecitationResource[];
  verses: Verse[];
  chapter: Chapter | null;
  mode: "surah" | "juz";
  currentJuz: number | null;
  selectedVerseKey: string | null;
  selectedWord: Word | null;
  playingVerseKey: string | null;
  playingWordLocation: string | null;
  playMode: PlayMode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
  modal: ModalName;
  searchQuery: string;
  searchResults: SearchHit[];
  searchOpen: boolean;
  searching: boolean;
  filters: SearchFilters;
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Highlight[];
  swatches: HighlightSwatch[];
  highlighting: boolean;
  visibleVerseKeys: string[];
  user: SessionUser | null;
  hydrated: boolean;
  introduction: string;
  progress: ReadingProgress;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  openSurah: (id: number, verseNumber?: number) => void;
  openJuz: (n: number) => void;
  selectVerse: (key: string) => void;
  selectWord: (word: Word | null) => void;
  cueVerse: (verseKey: string) => void;
  playFrom: (verseKey: string) => void;
  playVerse: (verseKey: string) => void;
  playWord: (word: Word) => void;
  togglePlay: () => void;
  stopAudio: () => void;
  seek: (time: number) => void;
  openModal: (name: Exclude<ModalName, null>) => void;
  closeModal: () => void;
  setSearchQuery: (value: string) => void;
  setSearchOpen: (value: boolean) => void;
  runSearch: (value?: string) => Promise<void>;
  setFilters: (value: SearchFilters) => void;
  applyFilters: () => void;
  jumpToHit: (hit: SearchHit) => void;
  toggleBookmarkVerse: (verse: Verse) => void;
  bookmarkWord: (verse: Verse, word: Word) => void;
  saveNote: (verseKey: string, body: string) => void;
  setHighlighting: (value: boolean) => void;
  setVisibleVerseKeys: (keys: string[]) => void;
  setActiveSwatch: (id: string) => void;
  highlightAyah: (verse: Verse, swatchId?: string) => void;
  highlightWords: (verse: Verse, startWord: number, endWord: number, swatchId?: string) => void;
  toggleWordHighlight: (verse: Verse, word: Word, swatchId?: string) => void;
  highlightText: (
    verse: Verse,
    layer: Exclude<HighlightLayer, "arabic" | "ayah">,
    start: number,
    end: number,
    text: string,
    swatchId?: string,
  ) => void;
  deleteHighlight: (id: string) => void;
  deleteHighlights: (ids: string[]) => void;
  clearVerseHighlights: (verseKey: string) => void;
  addSwatch: (name: string, color: string) => void;
  updateSwatch: (id: string, patch: Partial<Pick<HighlightSwatch, "name" | "color">>) => void;
  removeSwatch: (id: string) => void;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (username: string, password: string, displayName: string) => Promise<string | null>;
  signInWithGoogle: (email: string) => Promise<string | null>;
  signOut: () => void;
  offerResume: boolean;
  clearResume: () => void;
};

const MushafContext = createContext<MushafContextValue | null>(null);

const defaultFilters: SearchFilters = {
  themes: [],
  revelation: "all",
  juz: "all",
  queryIn: "all",
};

function verseIndex(verses: Verse[], key: string | null) {
  return verses.findIndex((verse) => verse.verseKey === key);
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSession(account: UserAccount): SessionUser {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    email: account.email,
    provider: account.provider ?? "local",
  };
}

export function MushafProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [juzs, setJuzs] = useState<Juz[]>([]);
  const [translations, setTranslations] = useState<TranslationResource[]>([]);
  const [recitations, setRecitations] = useState<RecitationResource[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [mode, setMode] = useState<"surah" | "juz">("surah");
  const [currentJuz, setCurrentJuz] = useState<number | null>(null);
  const [selectedVerseKey, setSelectedVerseKey] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
  const [playingWordLocation, setPlayingWordLocation] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [swatches, setSwatches] = useState<HighlightSwatch[]>(defaultSwatches);
  const [highlighting, setHighlighting] = useState(false);
  const [visibleVerseKeys, setVisibleVerseKeysState] = useState<string[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [introduction, setIntroduction] = useState("");
  const [progress, setProgress] = useState<ReadingProgress>(defaultReadingProgress);
  const [resumeCue, setResumeCue] = useState(false);
  const visibleRef = useRef(visibleVerseKeys);
  visibleRef.current = visibleVerseKeys;
  const placeRef = useRef<string | null>(null);
  const readingKey = playingVerseKey ?? visibleVerseKeys[0] ?? null;
  placeRef.current = readingKey;
  const hiddenAtRef = useRef(0);

  useEffect(() => {
    setPreferences(loadPreferences());
    setBookmarks(loadBookmarks());
    setNotes(loadNotes());
    setHighlights(loadHighlights());
    setSwatches(loadSwatches());
    setUser(loadSession());
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePreferences(preferences);
    const layout = layoutSignals(preferences);
    document.documentElement.dataset.theme = appliedTheme(pathname, preferences.theme);
    document.documentElement.dataset.layers = String(layout.layers);
    document.documentElement.dataset.size = layout.size;
    document.documentElement.dataset.script = layout.script;
    document.documentElement.style.setProperty("--reading-size", `${preferences.fontSize}px`);
  }, [hydrated, pathname, preferences]);

  useEffect(() => {
    if (!hydrated) return;
    saveProgress(progress);
  }, [hydrated, progress]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (visibleRef.current.length === 0) return;
      setProgress((current) => addReadingSeconds(current, 15));
    }, 15000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!readingKey) return;
    const wait = playingVerseKey ? 800 : 900;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      setProgress((current) => saveReadingPlace(current, readingKey));
    }, wait);
    return () => window.clearTimeout(timer);
  }, [hydrated, loading, playingVerseKey, readingKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (isResumeDue(loadProgress())) setResumeCue(true);
  }, [hydrated]);

  useEffect(() => {
    const flush = () => {
      const key = placeRef.current;
      if (key) setProgress((current) => saveReadingPlace(current, key, { touch: false }));
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        flush();
        return;
      }
      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current >= RESUME_AFTER_MS) {
        setResumeCue(true);
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    Promise.all([getChapters(), getJuzs(), getTranslations(), getRecitations()])
      .then(([nextChapters, nextJuzs, nextTranslations, nextRecitations]) => {
        setChapters(nextChapters);
        setJuzs(nextJuzs);
        setTranslations(nextTranslations);
        setRecitations(nextRecitations);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load Quran metadata");
      });
  }, []);

  const loadSurah = useCallback(
    async (id: number, verseNumber?: number) => {
      setLoading(true);
      setError(null);
      setMode("surah");
      setCurrentJuz(null);
      try {
        const data = await getSurah(id, preferences.translationIds, preferences.recitationId);
        setChapter(data.chapter);
        setVerses(data.verses);
        setIntroduction(data.introduction ?? "");
        const key = verseNumber
          ? `${id}:${verseNumber}`
          : data.verses[0]?.verseKey ?? null;
        setSelectedVerseKey(key);
        setSelectedWord(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load surah");
      } finally {
        setLoading(false);
      }
    },
    [preferences.recitationId, preferences.translationIds],
  );

  const loadJuzData = useCallback(
    async (n: number) => {
      setLoading(true);
      setError(null);
      setMode("juz");
      setCurrentJuz(n);
      try {
        const data = await getJuz(n, preferences.translationIds);
        setVerses(data.verses);
        const first = data.verses[0];
        setChapter(chapters.find((item) => item.id === first?.chapterId) ?? null);
        setIntroduction("");
        setSelectedVerseKey(first?.verseKey ?? null);
        setSelectedWord(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load juz");
      } finally {
        setLoading(false);
      }
    },
    [chapters, preferences.translationIds],
  );

  const openSurah = useCallback(
    (id: number, verseNumber?: number) => {
      const href = verseNumber ? `/surah/${id}#ayah-${verseNumber}` : `/surah/${id}`;
      if (pathname !== `/surah/${id}`) router.push(href);
      else void loadSurah(id, verseNumber);
    },
    [loadSurah, pathname, router],
  );

  const openJuz = useCallback(
    (n: number) => {
      if (pathname !== `/juz/${n}`) router.push(`/juz/${n}`);
      else void loadJuzData(n);
    },
    [loadJuzData, pathname, router],
  );

  useEffect(() => {
    const lock = pathname === "/read" || pathname.startsWith("/surah/") || pathname.startsWith("/juz/");
    document.documentElement.dataset.scroll = lock ? "lock" : "page";
  }, [pathname]);

  useEffect(() => {
    const surahMatch = pathname.match(/^\/surah\/(\d+)/);
    const juzMatch = pathname.match(/^\/juz\/(\d+)/);
    if (surahMatch) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const verse = hash.startsWith("#ayah-") ? Number(hash.replace("#ayah-", "")) : undefined;
      void loadSurah(Number(surahMatch[1]), Number.isFinite(verse) ? verse : undefined);
      return;
    }
    if (juzMatch) {
      void loadJuzData(Number(juzMatch[1]));
      return;
    }
    if (pathname === "/read") void loadSurah(1);
  }, [loadJuzData, loadSurah, pathname]);

  const updatePreferences = useCallback((partial: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = {
        ...current,
        ...partial,
        studyCards: partial.studyCards
          ? mergeStudyCards(current.studyCards, partial.studyCards)
          : current.studyCards,
      };
      if (partial.translationIds) {
        return { ...next, ...withTranslationIds(partial.translationIds) };
      }
      if (partial.translationId != null && partial.translationIds === undefined) {
        const rest = current.translationIds.filter((id) => id !== partial.translationId);
        return { ...next, ...withTranslationIds([partial.translationId, ...rest]) };
      }
      return next;
    });
  }, []);

  const loadSource = useCallback(
    async (url: string | null, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio || !url) return;
      const next = new URL(url, window.location.href).href;
      if (audio.src !== next) {
        audio.pause();
        audio.src = url;
        audio.load();
      }
      audio.currentTime = 0;
      audio.playbackRate = preferences.playbackRate;
      setCurrentTime(0);
      if (!autoplay) {
        audio.pause();
        setIsPlaying(false);
        return;
      }
      await audio.play();
      setIsPlaying(true);
    },
    [preferences.playbackRate],
  );

  const playSource = useCallback(
    async (url: string | null) => {
      await loadSource(url, true);
    },
    [loadSource],
  );

  const cueVerse = useCallback(
    async (verseKey: string) => {
      const verse = verses.find((item) => item.verseKey === verseKey);
      if (!verse) return;
      setPlayMode("from-here");
      setPlayingVerseKey(verseKey);
      setPlayingWordLocation(null);
      setSelectedVerseKey(verseKey);
      await loadSource(verse.audioUrl, false);
    },
    [loadSource, verses],
  );

  const playVerse = useCallback(
    async (verseKey: string) => {
      const verse = verses.find((item) => item.verseKey === verseKey);
      if (!verse) return;
      setPlayMode("verse");
      setPlayingVerseKey(verseKey);
      setPlayingWordLocation(null);
      setSelectedVerseKey(verseKey);
      setProgress((current) => saveReadingPlace(markVerseRead(current, verseKey), verseKey));
      await playSource(verse.audioUrl);
    },
    [playSource, verses],
  );

  const playFrom = useCallback(
    async (verseKey: string) => {
      const verse = verses.find((item) => item.verseKey === verseKey);
      if (!verse) return;
      setPlayMode("from-here");
      setPlayingVerseKey(verseKey);
      setPlayingWordLocation(null);
      setSelectedVerseKey(verseKey);
      setProgress((current) => saveReadingPlace(markVerseRead(current, verseKey), verseKey));
      await playSource(verse.audioUrl);
    },
    [playSource, verses],
  );

  const playWord = useCallback(
    async (word: Word) => {
      setPlayMode("word");
      setPlayingWordLocation(word.location);
      setSelectedWord(word);
      await playSource(wordByWordAudioUrl(word.location) ?? word.audioUrl);
    },
    [playSource],
  );

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    setIsPlaying(false);
    setPlayMode("idle");
    setPlayingWordLocation(null);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (audio.src && playingVerseKey) {
      audio.playbackRate = preferences.playbackRate;
      void audio.play().then(() => setIsPlaying(true));
      return;
    }
    if (playingVerseKey) void playFrom(playingVerseKey);
    else if (selectedVerseKey) void playFrom(selectedVerseKey);
    else if (verses[0]) void playFrom(verses[0].verseKey);
  }, [isPlaying, playFrom, playingVerseKey, preferences.playbackRate, selectedVerseKey, verses]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (playMode === "from-here" && playingVerseKey) {
        const index = verseIndex(verses, playingVerseKey);
        const next = verses[index + 1];
        if (next) {
          void playFrom(next.verseKey);
          return;
        }
      }
      setIsPlaying(false);
      if (playMode !== "verse") setPlayMode("idle");
      setPlayingWordLocation(null);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playFrom, playMode, playingVerseKey, verses]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = preferences.playbackRate;
  }, [preferences.playbackRate]);

  useEffect(() => {
    if (mode !== "surah" || !chapter) return;
    let cancelled = false;
    getAudioMap(preferences.recitationId, chapter.id)
      .then((map) => {
        if (cancelled) return;
        setVerses((current) =>
          current.map((verse) => ({
            ...verse,
            audioUrl: map[verse.verseKey] ?? verse.audioUrl,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chapter, mode, preferences.recitationId]);

  const runSearch = useCallback(
    async (value?: string) => {
      const query = (value ?? searchQuery).trim();
      setSearchQuery(query);
      if (!query && filters.themes.length === 0) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const topicHits: SearchHit[] = filters.themes.flatMap((id) => {
          const topic = TOPICS.find((item) => item.id === id);
          return (topic?.verses ?? []).map((verseKey) => {
            const [chapterId, verseNumber] = verseKey.split(":").map(Number);
            return {
              verseKey,
              chapterId,
              verseNumber,
              textArabic: "",
              textTranslation: topic?.name ?? "Theme",
              source: "theme" as const,
            };
          });
        });
        const remote = query ? (await searchQuran(query, preferences.translationId)).results : [];
        const merged = new Map<string, SearchHit>();
        for (const hit of [...topicHits, ...remote]) merged.set(hit.verseKey, hit);
        let results = Array.from(merged.values());
        if (filters.revelation !== "all") {
          results = results.filter((hit) => chapters.find((item) => item.id === hit.chapterId)?.revelationPlace === filters.revelation);
        }
        if (filters.juz !== "all") {
          const mapping = juzs.find((item) => item.juzNumber === filters.juz)?.verseMapping ?? {};
          results = results.filter((hit) => mapping[String(hit.chapterId)]);
        }
        setSearchResults(results);
        setSearchOpen(true);
      } finally {
        setSearching(false);
      }
    },
    [chapters, filters, juzs, preferences.translationId, searchQuery],
  );

  const applyFilters = useCallback(() => {
    setModal(null);
    void runSearch();
  }, [runSearch]);

  const jumpToHit = useCallback(
    (hit: SearchHit) => {
      setSearchOpen(false);
      openSurah(hit.chapterId, hit.verseNumber);
    },
    [openSurah],
  );

  const toggleBookmarkVerse = useCallback((verse: Verse) => {
    setBookmarks((current) => {
      const exists = current.find((item) => item.type === "verse" && item.verseKey === verse.verseKey);
      const next = exists
        ? current.filter((item) => item.id !== exists.id)
        : [
            ...current,
            {
              id: crypto.randomUUID(),
              type: "verse" as const,
              verseKey: verse.verseKey,
              label: `Verse ${verse.verseKey}`,
              createdAt: new Date().toISOString(),
            },
          ];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const bookmarkWord = useCallback((verse: Verse, word: Word) => {
    setBookmarks((current) => {
      const next = [
        ...current,
        {
          id: crypto.randomUUID(),
          type: "word" as const,
          verseKey: verse.verseKey,
          wordLocation: word.location,
          wordText: word.textUthmani,
          label: `${word.textUthmani} · ${word.translation || verse.verseKey}`,
          createdAt: new Date().toISOString(),
        },
      ];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const saveNote = useCallback((verseKey: string, body: string) => {
    setNotes((current) => {
      const trimmed = body.trim();
      const existing = current.find((item) => item.verseKey === verseKey);
      const next = !trimmed
        ? current.filter((item) => item.verseKey !== verseKey)
        : existing
          ? current.map((item) =>
              item.verseKey === verseKey
                ? { ...item, body: trimmed, updatedAt: new Date().toISOString() }
                : item,
            )
          : [...current, { id: crypto.randomUUID(), verseKey, body: trimmed, updatedAt: new Date().toISOString() }];
      saveNotes(next);
      return next;
    });
    if (body.trim()) setProgress((current) => saveReadingPlace(markVerseRead(current, verseKey), verseKey));
  }, []);

  const commitHighlights = useCallback((next: Highlight[]) => {
    saveHighlights(next);
    setHighlights(next);
  }, []);

  const setActiveSwatch = useCallback((id: string) => {
    setPreferences((current) => ({ ...current, activeSwatchId: id }));
  }, []);

  const setVisibleVerseKeys = useCallback((keys: string[]) => {
    setVisibleVerseKeysState((current) =>
      current.length === keys.length && current.every((key, index) => key === keys[index]) ? current : keys,
    );
  }, []);

  useEffect(() => {
    if (visibleVerseKeys.length === 0) return;
    const timers = visibleVerseKeys.map((key) =>
      window.setTimeout(() => {
        setProgress((current) => markVerseRead(current, key));
      }, 4000),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [visibleVerseKeys]);

  useEffect(() => {
    if (mode !== "surah" || !chapter || verses.length === 0) return;
    const keys = verses.map((item) => item.verseKey);
    if (!keys.every((key) => progress.versesRead.includes(key))) return;
    if (progress.surahsRead.includes(chapter.id)) return;
    setProgress((current) => markSurahRead(current, chapter.id));
  }, [chapter, mode, progress.surahsRead, progress.versesRead, verses]);

  const highlightAyah = useCallback(
    (verse: Verse, swatchId?: string) => {
      const color = swatchId ?? preferences.activeSwatchId ?? DEFAULT_SWATCH_ID;
      commitHighlights(toggleAyahHighlight(highlights, verse.verseKey, color, verse.translation || verse.verseKey));
      setProgress((current) => saveReadingPlace(markVerseRead(current, verse.verseKey), verse.verseKey));
    },
    [commitHighlights, highlights, preferences.activeSwatchId],
  );

  const highlightWords = useCallback(
    (verse: Verse, startWord: number, endWord: number, swatchId?: string) => {
      const color = swatchId ?? preferences.activeSwatchId ?? DEFAULT_SWATCH_ID;
      const words = verse.words.filter((item) => item.charType === "word");
      const lo = Math.min(startWord, endWord);
      const hi = Math.max(startWord, endWord);
      const text = words
        .filter((item) => item.position >= lo && item.position <= hi)
        .map((item) => item.textUthmani)
        .join(" ");
      commitHighlights(paintArabicRange(highlights, verse.verseKey, lo, hi, color, text));
    },
    [commitHighlights, highlights, preferences.activeSwatchId],
  );

  const toggleWordHighlight = useCallback(
    (verse: Verse, word: Word, swatchId?: string) => {
      const color = swatchId ?? preferences.activeSwatchId ?? DEFAULT_SWATCH_ID;
      commitHighlights(toggleArabicWord(highlights, verse.verseKey, word.position, color, word.textUthmani));
    },
    [commitHighlights, highlights, preferences.activeSwatchId],
  );

  const highlightText = useCallback(
    (
      verse: Verse,
      layer: Exclude<HighlightLayer, "arabic" | "ayah">,
      start: number,
      end: number,
      text: string,
      swatchId?: string,
    ) => {
      const color = swatchId ?? preferences.activeSwatchId ?? DEFAULT_SWATCH_ID;
      commitHighlights(addTextHighlight(highlights, verse.verseKey, layer, color, start, end, text));
    },
    [commitHighlights, highlights, preferences.activeSwatchId],
  );

  const deleteHighlight = useCallback(
    (id: string) => {
      commitHighlights(removeHighlight(highlights, id));
    },
    [commitHighlights, highlights],
  );

  const deleteHighlights = useCallback(
    (ids: string[]) => {
      commitHighlights(removeHighlights(highlights, ids));
    },
    [commitHighlights, highlights],
  );

  const clearVerseHighlights = useCallback(
    (verseKey: string) => {
      commitHighlights(dropVerseHighlights(highlights, verseKey));
    },
    [commitHighlights, highlights],
  );

  const addSwatch = useCallback((name: string, color: string) => {
    setSwatches((current) => {
      const next = [
        ...current,
        { id: crypto.randomUUID(), name: name.trim() || "Pen", color },
      ];
      saveSwatches(next);
      return next;
    });
  }, []);

  const updateSwatch = useCallback((id: string, patch: Partial<Pick<HighlightSwatch, "name" | "color">>) => {
    setSwatches((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveSwatches(next);
      return next;
    });
  }, []);

  const removeSwatch = useCallback(
    (id: string) => {
      if (id === DEFAULT_SWATCH_ID) return;
      setSwatches((current) => {
        const next = current.filter((item) => item.id !== id);
        saveSwatches(next.length ? next : defaultSwatches);
        return next.length ? next : defaultSwatches;
      });
      if (preferences.activeSwatchId === id) {
        setPreferences((current) => ({ ...current, activeSwatchId: DEFAULT_SWATCH_ID }));
      }
    },
    [preferences.activeSwatchId],
  );

  const signIn = useCallback(async (username: string, password: string) => {
    const users = loadUsers();
    const hash = await hashPassword(password);
    const found = users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
    if (!found || !found.passwordHash || found.passwordHash !== hash) {
      return "Username or password is incorrect.";
    }
    const session = toSession(found);
    saveSession(session);
    setUser(session);
    setModal(null);
    setResumeCue(true);
    return null;
  }, []);

  const signUp = useCallback(async (username: string, password: string, displayName: string) => {
    const trimmed = username.trim();
    if (trimmed.length < 3) return "Username needs at least 3 characters.";
    if (password.length < 8) return "Password needs at least 8 characters.";
    const users = loadUsers();
    if (users.some((item) => item.username.toLowerCase() === trimmed.toLowerCase())) {
      return "That username is already taken.";
    }
    const account: UserAccount = {
      id: crypto.randomUUID(),
      username: trimmed,
      displayName: displayName.trim() || trimmed,
      passwordHash: await hashPassword(password),
      provider: "local",
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, account]);
    const session = toSession(account);
    saveSession(session);
    setUser(session);
    setModal(null);
    setResumeCue(true);
    requestWelcomeTour();
    if (!/^\/(read$|surah\/|juz\/)/.test(pathname)) router.push("/read");
    return null;
  }, [pathname, router]);

  const signInWithGoogle = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
    const users = loadUsers();
    const existing = users.find(
      (item) => item.email?.toLowerCase() === trimmed || item.username.toLowerCase() === trimmed,
    );
    const account: UserAccount = existing
      ? { ...existing, email: existing.email ?? trimmed, provider: existing.provider ?? "google" }
      : {
          id: crypto.randomUUID(),
          username: trimmed,
          email: trimmed,
          displayName: displayNameFromEmail(trimmed),
          passwordHash: "",
          provider: "google",
          createdAt: new Date().toISOString(),
        };
    saveUsers(existing ? users.map((item) => (item.id === account.id ? account : item)) : [...users, account]);
    const session = toSession(account);
    saveSession(session);
    setUser(session);
    setModal(null);
    setResumeCue(true);
    if (!existing) {
      requestWelcomeTour();
      if (!/^\/(read$|surah\/|juz\/)/.test(pathname)) router.push("/read");
    }
    return null;
  }, [pathname, router]);

  const signOut = useCallback(() => {
    saveSession(null);
    setUser(null);
  }, []);

  const value = useMemo<MushafContextValue>(
    () => ({
      preferences,
      updatePreferences,
      chapters,
      juzs,
      translations,
      recitations,
      verses,
      chapter,
      mode,
      currentJuz,
      selectedVerseKey,
      selectedWord,
      playingVerseKey,
      playingWordLocation,
      playMode,
      isPlaying,
      currentTime,
      duration,
      loading,
      error,
      modal,
      searchQuery,
      searchResults,
      searchOpen,
      searching,
      filters,
      bookmarks,
      notes,
      highlights,
      swatches,
      highlighting,
      visibleVerseKeys,
      user,
      hydrated,
      introduction,
      progress,
      audioRef,
      openSurah,
      openJuz,
      selectVerse: setSelectedVerseKey,
      selectWord: setSelectedWord,
      cueVerse,
      playFrom,
      playVerse,
      playWord,
      togglePlay,
      stopAudio,
      seek,
      openModal: setModal,
      closeModal: () => setModal(null),
      setSearchQuery,
      setSearchOpen,
      runSearch,
      setFilters,
      applyFilters,
      jumpToHit,
      toggleBookmarkVerse,
      bookmarkWord,
      saveNote,
      setHighlighting,
      setVisibleVerseKeys,
      setActiveSwatch,
      highlightAyah,
      highlightWords,
      toggleWordHighlight,
      highlightText,
      deleteHighlight,
      deleteHighlights,
      clearVerseHighlights,
      addSwatch,
      updateSwatch,
      removeSwatch,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      offerResume: resumeCue,
      clearResume: () => setResumeCue(false),
    }),
    [
      addSwatch,
      applyFilters,
      bookmarks,
      chapter,
      chapters,
      cueVerse,
      currentJuz,
      currentTime,
      clearVerseHighlights,
      deleteHighlight,
      deleteHighlights,
      duration,
      error,
      filters,
      highlightAyah,
      highlightText,
      highlightWords,
      highlighting,
      highlights,
      hydrated,
      introduction,
      isPlaying,
      jumpToHit,
      juzs,
      loading,
      modal,
      mode,
      notes,
      openJuz,
      openSurah,
      playFrom,
      playMode,
      playVerse,
      playWord,
      playingVerseKey,
      playingWordLocation,
      preferences,
      progress,
      recitations,
      removeSwatch,
      resumeCue,
      runSearch,
      searchOpen,
      searchQuery,
      searchResults,
      searching,
      seek,
      selectedVerseKey,
      selectedWord,
      setVisibleVerseKeys,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      stopAudio,
      swatches,
      toggleBookmarkVerse,
      togglePlay,
      toggleWordHighlight,
      translations,
      updatePreferences,
      updateSwatch,
      user,
      verses,
      visibleVerseKeys,
    ],
  );

  return (
    <MushafContext.Provider value={value}>
      <audio ref={audioRef} preload="none" className="hidden" />
      {children}
    </MushafContext.Provider>
  );
}

export function useMushaf() {
  const value = useContext(MushafContext);
  if (!value) throw new Error("useMushaf must be used within MushafProvider");
  return value;
}
