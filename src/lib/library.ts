import { validateAvatar } from "@/lib/avatar";
import { cleanDisplayName, validateDisplayName } from "@/lib/display-name";
import { defaultPreferences, preferencesFromUnknown } from "@/lib/storage";
import {
  defaultReadingProgress,
  earlierHistorySince,
  mergeDaily,
  mergeSurahCompletions,
  mergeVerseVisits,
  normalizeReadingProgress,
  normalizeSurahCompletions,
  normalizeVerseVisits,
  syncSurahsRead,
  type ReadingProgress,
} from "@/lib/reading";
import { normalizeNote, normalizeNotes } from "@/lib/notes";
import { cleanSwatches, swatchesOrDefaults } from "@/lib/swatch-palette";
import type { Bookmark, Highlight, HighlightSwatch, Note, Preferences } from "@/lib/quran/types";

export type LibrarySnapshot = {
  preferences: Preferences;
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Highlight[];
  swatches: HighlightSwatch[];
  progress: ReadingProgress;
  displayName?: string;
  displayNameUpdatedAt?: string;
  avatar?: string;
  avatarUpdatedAt?: string;
};

function byId<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

function highlightIdentity(item: Highlight) {
  return [
    item.verseKey,
    item.layer,
    item.startWord ?? "",
    item.endWord ?? "",
    item.startOffset ?? "",
    item.endOffset ?? "",
    item.text,
  ].join("|");
}

function dedupeHighlights(items: Highlight[]) {
  const map = new Map<string, Highlight>();
  for (const item of byId(items)) {
    const key = highlightIdentity(item);
    const current = map.get(key);
    if (!current || item.createdAt >= current.createdAt) map.set(key, item);
  }
  return [...map.values()];
}

function laterIso(a?: string, b?: string) {
  return (a ?? "") >= (b ?? "") ? a : b;
}

export function mergeLibraries(local: LibrarySnapshot, remote: LibrarySnapshot): LibrarySnapshot {
  const notes = new Map<string, Note>();
  for (const raw of [...remote.notes, ...local.notes]) {
    const note = normalizeNote(raw);
    if (!note) continue;
    const current = notes.get(note.verseKey);
    if (!current || (note.updatedAt ?? "") >= (current.updatedAt ?? "")) notes.set(note.verseKey, note);
  }

  const verseBookmarks = new Map<string, Bookmark>();
  const wordBookmarks = new Map<string, Bookmark>();
  const otherBookmarks: Bookmark[] = [];
  for (const item of [...remote.bookmarks, ...local.bookmarks]) {
    if (item.type === "verse") {
      const current = verseBookmarks.get(item.verseKey);
      if (!current || item.createdAt >= current.createdAt) verseBookmarks.set(item.verseKey, item);
    } else if (item.type === "word" && item.wordLocation) {
      const current = wordBookmarks.get(item.wordLocation);
      if (!current || item.createdAt >= current.createdAt) wordBookmarks.set(item.wordLocation, item);
    } else {
      const key = `${item.verseKey}|${item.endVerseKey ?? ""}|${item.label}`;
      const index = otherBookmarks.findIndex(
        (current) => `${current.verseKey}|${current.endVerseKey ?? ""}|${current.label}` === key,
      );
      if (index === -1 || item.createdAt >= (otherBookmarks[index]?.createdAt ?? "")) {
        if (index >= 0) otherBookmarks.splice(index, 1);
        otherBookmarks.push(item);
      }
    }
  }

  const localActive = local.progress.lastActiveAt ?? 0;
  const remoteActive = remote.progress.lastActiveAt ?? 0;
  const preferences = localActive >= remoteActive ? local.preferences : remote.preferences;
  // Place follows whoever was reading more recently. A newer ayah with an
  // older stamp loses, so every place change has to bump lastActiveAt.
  const lastVerseKey = localActive >= remoteActive ? local.progress.lastVerseKey : remote.progress.lastVerseKey;
  const localNameAt = local.displayNameUpdatedAt ?? "";
  const remoteNameAt = remote.displayNameUpdatedAt ?? "";
  const displayName = localNameAt >= remoteNameAt ? local.displayName : remote.displayName;
  const displayNameUpdatedAt = localNameAt >= remoteNameAt ? local.displayNameUpdatedAt : remote.displayNameUpdatedAt;
  const localAvatarAt = local.avatarUpdatedAt ?? "";
  const remoteAvatarAt = remote.avatarUpdatedAt ?? "";
  const avatar = localAvatarAt >= remoteAvatarAt ? local.avatar : remote.avatar;
  const avatarUpdatedAt = localAvatarAt >= remoteAvatarAt ? local.avatarUpdatedAt : remote.avatarUpdatedAt;

  return {
    preferences: { ...defaultPreferences, ...preferences },
    displayName: displayName?.trim() || undefined,
    displayNameUpdatedAt: displayNameUpdatedAt || undefined,
    avatar: avatar || undefined,
    avatarUpdatedAt: avatarUpdatedAt || undefined,
    bookmarks: [...verseBookmarks.values(), ...wordBookmarks.values(), ...byId(otherBookmarks)],
    notes: [...notes.values()],
    highlights: dedupeHighlights([...remote.highlights, ...local.highlights]),
    swatches: byId([...cleanSwatches(remote.swatches), ...cleanSwatches(local.swatches)]),
    progress: syncSurahsRead({
      surahsRead: [...new Set([...remote.progress.surahsRead, ...local.progress.surahsRead])].sort((a, b) => a - b),
      surahCompletions: mergeSurahCompletions(
        normalizeSurahCompletions(remote.progress.surahCompletions, remote.progress.surahsRead),
        normalizeSurahCompletions(local.progress.surahCompletions, local.progress.surahsRead),
      ),
      versesRead: [...new Set([...remote.progress.versesRead, ...local.progress.versesRead])],
      verseVisits: mergeVerseVisits(
        normalizeVerseVisits(remote.progress.verseVisits, remote.progress.versesRead),
        normalizeVerseVisits(local.progress.verseVisits, local.progress.versesRead),
      ),
      totalSeconds: Math.max(remote.progress.totalSeconds, local.progress.totalSeconds),
      streak: Math.max(remote.progress.streak, local.progress.streak),
      lastReadDay: laterIso(remote.progress.lastReadDay ?? undefined, local.progress.lastReadDay ?? undefined) ?? null,
      lastVerseKey,
      lastActiveAt: Math.max(localActive, remoteActive) || null,
      daily: mergeDaily(remote.progress.daily, local.progress.daily),
      historySince: earlierHistorySince(remote.progress.historySince, local.progress.historySince),
    }),
  };
}

function safeDisplayName(name: unknown, updatedAt: unknown) {
  if (typeof name !== "string") return {};
  const displayName = cleanDisplayName(name).slice(0, 40);
  if (!displayName || validateDisplayName(displayName)) return {};
  return {
    displayName,
    displayNameUpdatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
  };
}

export function emptyLibrary(): LibrarySnapshot {
  return {
    preferences: defaultPreferences,
    bookmarks: [],
    notes: [],
    highlights: [],
    swatches: [],
    progress: defaultReadingProgress,
  };
}

export function normalizeLibrary(value: unknown): LibrarySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<LibrarySnapshot>;
  return {
    preferences: preferencesFromUnknown(raw.preferences),
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    // Notes are fields inside the sealed library JSON, not their own columns.
    // createdAt is filled from updatedAt when an older library omits it.
    notes: normalizeNotes(raw.notes),
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
    swatches: swatchesOrDefaults(cleanSwatches(raw.swatches)),
    progress: normalizeReadingProgress(raw.progress),
    ...safeDisplayName(raw.displayName, raw.displayNameUpdatedAt),
    ...safeAvatar(raw.avatar, raw.avatarUpdatedAt),
  };
}

function safeAvatar(avatar: unknown, updatedAt: unknown) {
  const stamp = typeof updatedAt === "string" && updatedAt ? updatedAt : undefined;
  if (typeof avatar === "string" && avatar && !validateAvatar(avatar)) {
    return { avatar, avatarUpdatedAt: stamp || new Date(0).toISOString() };
  }
  if (stamp) return { avatarUpdatedAt: stamp };
  return {};
}

