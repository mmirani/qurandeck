"use client";

import Link from "next/link";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { readerHref, topAyahsByVisits, topSurahsByVisits } from "@/lib/reading";

export function HomeReadingRanks() {
  const { progress, chapters } = useMushaf();
  const surahs = topSurahsByVisits(progress, 6);
  const ayahs = topAyahsByVisits(progress, 6);
  if (surahs.length === 0 && ayahs.length === 0) return null;

  const surahName = (id: number) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`;

  return (
    <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2">
      <section className="flex h-full flex-col rounded-3xl border border-line bg-surface px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-ink">Most read surahs</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Surahs you return to most while reading</p>
        {surahs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Read a few surahs and they will rank here.</p>
        ) : (
          <ol className="mt-3 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
            {surahs.map((item, index) => (
              <li key={item.chapterId}>
                <Link
                  href={`/surah/${item.chapterId}`}
                  className="flex h-full min-h-[4.5rem] flex-col rounded-2xl border border-line/70 bg-canvas/40 px-2.5 py-2 hover:border-gold/40 hover:bg-highlight"
                >
                  <span className="text-[10px] tabular-nums text-gold-deep">{index + 1}</span>
                  <span className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-ink">{surahName(item.chapterId)}</span>
                  <span className="mt-auto pt-1 text-[11px] tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex h-full flex-col rounded-3xl border border-line bg-surface px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-ink">Most read ayahs</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Ayahs you dwell on, play, or mark most often</p>
        {ayahs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Stay with an ayah and it will start to rise here.</p>
        ) : (
          <ol className="mt-3 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
            {ayahs.map((item, index) => (
              <li key={item.verseKey}>
                <Link
                  href={readerHref(item.verseKey)}
                  className="flex h-full min-h-[4.5rem] flex-col rounded-2xl border border-line/70 bg-canvas/40 px-2.5 py-2 hover:border-gold/40 hover:bg-highlight"
                >
                  <span className="text-[10px] tabular-nums text-gold-deep">{index + 1}</span>
                  <span className="mt-0.5 line-clamp-1 text-sm font-medium leading-snug text-ink">{surahName(item.chapterId)}</span>
                  <span className="text-[11px] text-ink-soft">{item.verseKey}</span>
                  <span className="mt-auto pt-1 text-[11px] tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function formatVisits(count: number) {
  return `${count.toLocaleString("en-US")}×`;
}
