import type { Note } from "@/lib/quran/types";

function stamp(value: unknown) {
  return typeof value === "string" && value ? value : "";
}

/** Fill createdAt from updatedAt for notes saved before that field existed. */
export function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Note>;
  if (typeof raw.verseKey !== "string" || !raw.verseKey) return null;
  if (typeof raw.body !== "string") return null;
  const updatedAt = stamp(raw.updatedAt) || stamp(raw.createdAt) || new Date(0).toISOString();
  const createdAt = stamp(raw.createdAt) || updatedAt;
  const id = stamp(raw.id) || `note-${raw.verseKey}-${createdAt}`;
  return { id, verseKey: raw.verseKey, body: raw.body, createdAt, updatedAt };
}

export function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeNote(item)).filter((item): item is Note => item !== null);
}

export function notesMissingCreatedAt(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const createdAt = (item as Partial<Note>).createdAt;
    return typeof createdAt !== "string" || !createdAt;
  });
}

/**
 * Create, edit, or clear one verse note.
 * Returns the same array when nothing changed. Null means the note was deleted.
 */
export function noteAfterEdit(
  existing: Note | undefined,
  verseKey: string,
  body: string,
  now: string,
  id: string,
): Note | null | undefined {
  const trimmed = body.trim();
  if (!trimmed) return existing ? null : undefined;
  if (!existing) return { id, verseKey, body: trimmed, createdAt: now, updatedAt: now };
  if (existing.body === trimmed) return existing;
  return {
    ...existing,
    body: trimmed,
    createdAt: existing.createdAt || existing.updatedAt,
    updatedAt: now,
  };
}

export type NoteMetaPart = { dateTime: string; text: string };

export type NoteMeta = {
  created: NoteMetaPart;
  edited: NoteMetaPart | null;
};

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date: Date, locale?: string) {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTime(date: Date, locale?: string) {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
}

/**
 * Created date, plus Edited time on the same local day or Edited date otherwise.
 * Identical timestamps mean the note was never edited.
 */
export function formatNoteMeta(note: { createdAt?: string; updatedAt: string }, locale?: string): NoteMeta {
  const updatedAt = stamp(note.updatedAt) || stamp(note.createdAt) || new Date(0).toISOString();
  const createdAt = stamp(note.createdAt) || updatedAt;
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  if (createdAt === updatedAt) {
    const date = formatDate(created, locale);
    const time = formatTime(created, locale);
    const text = time ? `Created ${date}, ${time}` : `Created ${date}`;
    return { created: { dateTime: createdAt, text }, edited: null };
  }
  const editedText = sameLocalDay(created, updated) ? formatTime(updated, locale) : formatDate(updated, locale);
  return {
    created: { dateTime: createdAt, text: `Created ${formatDate(created, locale)}` },
    edited: editedText ? { dateTime: updatedAt, text: `Edited ${editedText}` } : null,
  };
}
