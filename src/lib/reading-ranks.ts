import { getSql } from "@/lib/db";
import type { LibrarySnapshot } from "@/lib/library";
import {
  normalizeVerseVisits,
  parseVerseKey,
  type RankedAyah,
} from "@/lib/reading";

const MAX_DELTA_PER_KEY = 50;
const MAX_KEYS_PER_SYNC = 400;
export const RANK_DAY_CAP = 40;
const VERSE_KEY = /^([1-9]\d{0,2}):([1-9]\d{0,2})$/;

export type ReadingRankRow = {
  verseKey: string;
  visits: number;
};

export type PlatformRankedSurah = { chapterId: number; visits: number; ayahs: number };

export type PlatformRanks = {
  surahs: PlatformRankedSurah[];
  ayahs: RankedAyah[];
};

let prepared = false;

export async function prepareReadingRanksStore() {
  if (prepared) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS reading_ranks (
      verse_key text PRIMARY KEY,
      visits bigint NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reading_rank_grants (
      account_id text NOT NULL,
      verse_key text NOT NULL,
      day text NOT NULL,
      PRIMARY KEY (account_id, verse_key, day)
    )
  `;
  prepared = true;
}

export function grantsToApply(alreadyToday: number, verseKeys: string[], alreadyGranted: Set<string>) {
  const room = Math.max(0, RANK_DAY_CAP - alreadyToday);
  const next: string[] = [];
  const seen = new Set(alreadyGranted);
  for (const key of verseKeys) {
    if (next.length >= room) break;
    if (!isRankVerseKey(key) || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  return next;
}

export function visitDeltas(previous: LibrarySnapshot | null, next: LibrarySnapshot) {
  const before = normalizeVerseVisits(previous?.progress.verseVisits, previous?.progress.versesRead ?? []);
  const after = normalizeVerseVisits(next.progress.verseVisits, next.progress.versesRead);
  const deltas: ReadingRankRow[] = [];

  for (const [key, count] of Object.entries(after)) {
    if (!isRankVerseKey(key)) continue;
    const bump = count - (before[key] ?? 0);
    if (bump <= 0) continue;
    deltas.push({ verseKey: key, visits: Math.min(MAX_DELTA_PER_KEY, bump) });
    if (deltas.length >= MAX_KEYS_PER_SYNC) break;
  }

  return deltas;
}

export function isRankVerseKey(key: string) {
  const match = VERSE_KEY.exec(key);
  if (!match) return false;
  const chapterId = Number(match[1]);
  const verseNumber = Number(match[2]);
  return chapterId >= 1 && chapterId <= 114 && verseNumber >= 1 && verseNumber <= 286;
}

export async function applyReadingRankDeltas(account: string, deltas: ReadingRankRow[]) {
  if (!account || deltas.length === 0) return;
  await prepareReadingRanksStore();
  const sql = getSql();
  const day = new Date().toISOString().slice(0, 10);
  const existing = (await sql`
    SELECT verse_key
    FROM reading_rank_grants
    WHERE account_id = ${account} AND day = ${day}
  `) as { verse_key: string }[];
  const granted = new Set(existing.map((row) => row.verse_key));
  const keys = grantsToApply(
    granted.size,
    deltas.map((item) => item.verseKey),
    granted,
  );
  for (const verseKey of keys) {
    const inserted = (await sql`
      INSERT INTO reading_rank_grants (account_id, verse_key, day)
      VALUES (${account}, ${verseKey}, ${day})
      ON CONFLICT (account_id, verse_key, day) DO NOTHING
      RETURNING verse_key
    `) as { verse_key: string }[];
    if (inserted.length === 0) continue;
    await sql`
      INSERT INTO reading_ranks (verse_key, visits, updated_at)
      VALUES (${verseKey}, 1, now())
      ON CONFLICT (verse_key) DO UPDATE
      SET visits = reading_ranks.visits + 1,
          updated_at = now()
    `;
  }
}

export async function resetPlatformRanks() {
  await prepareReadingRanksStore();
  const sql = getSql();
  await sql`DELETE FROM reading_rank_grants`;
  await sql`DELETE FROM reading_ranks`;
}

export async function loadPlatformRanks(limits: { surahs?: number; ayahs?: number } = {}): Promise<PlatformRanks> {
  const surahLimit = limits.surahs ?? 10;
  const ayahLimit = limits.ayahs ?? 10;
  await prepareReadingRanksStore();
  const sql = getSql();
  const rows = (await sql`
    SELECT verse_key, visits
    FROM reading_ranks
    WHERE visits > 0
    ORDER BY visits DESC
    LIMIT 500
  `) as { verse_key: string; visits: string | number }[];

  const visits: Record<string, number> = {};
  for (const row of rows) {
    const count = typeof row.visits === "number" ? row.visits : Number(row.visits);
    if (!isRankVerseKey(row.verse_key) || !Number.isFinite(count) || count < 1) continue;
    visits[row.verse_key] = Math.floor(count);
  }

  return {
    surahs: rankSurahs(visits, surahLimit),
    ayahs: rankAyahs(visits, ayahLimit),
  };
}

function rankAyahs(visits: Record<string, number>, limit: number): RankedAyah[] {
  return Object.entries(visits)
    .map(([verseKey, count]) => {
      const place = parseVerseKey(verseKey);
      if (!place) return null;
      return { verseKey, chapterId: place.chapterId, verseNumber: place.verseNumber, visits: count };
    })
    .filter((item): item is RankedAyah => Boolean(item))
    .sort((a, b) => b.visits - a.visits || a.chapterId - b.chapterId || a.verseNumber - b.verseNumber)
    .slice(0, limit);
}

function rankSurahs(visits: Record<string, number>, limit: number): PlatformRankedSurah[] {
  const bySurah = new Map<number, { visits: number; ayahs: number }>();
  for (const [key, count] of Object.entries(visits)) {
    const place = parseVerseKey(key);
    if (!place) continue;
    const current = bySurah.get(place.chapterId) ?? { visits: 0, ayahs: 0 };
    current.visits += count;
    current.ayahs += 1;
    bySurah.set(place.chapterId, current);
  }
  return [...bySurah.entries()]
    .map(([chapterId, stats]) => ({ chapterId, visits: stats.visits, ayahs: stats.ayahs }))
    .sort((a, b) => b.visits - a.visits || a.chapterId - b.chapterId)
    .slice(0, limit);
}
