"use client";

import Link from "next/link";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { readerHref, topAyahsByVisits, topSurahsByVisits } from "@/lib/reading";

export function HomeReadingRanks() {
  const { progress, chapters } = useMushaf();
  const surahs = topSurahsByVisits(progress, 5);
  const ayahs = topAyahsByVisits(progress, 5);
  if (surahs.length === 0 && ayahs.length === 0) return null;

  const surahName = (id: number) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`;

  return (
    <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2">
      <section className="flex h-full flex-col rounded-3xl border border-line bg-surface px-5 py-5 sm:px-6">
        <h3 className="text-sm font-semibold text-ink">Most read surahs</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Surahs you return to most while reading</p>
        {surahs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Read a few surahs and they will rank here.</p>
        ) : (
          <ol className="mt-4 flex-1 divide-y divide-line/60">
            {surahs.map((item, index) => (
              <li key={item.chapterId} className="h-[4.25rem]">
                <Link
                  href={`/surah/${item.chapterId}`}
                  className="flex h-full items-center justify-between gap-3 rounded-2xl px-1 hover:bg-highlight"
                >
                  <span className="min-w-0">
                    <span className="mr-2 text-xs tabular-nums text-gold-deep">{index + 1}</span>
                    <span className="font-medium text-ink">{surahName(item.chapterId)}</span>
                    <span className="mt-0.5 block pl-5 text-xs text-ink-soft">
                      {item.ayahs} ayah{item.ayahs === 1 ? "" : "s"} touched
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex h-full flex-col rounded-3xl border border-line bg-surface px-5 py-5 sm:px-6">
        <h3 className="text-sm font-semibold text-ink">Most read ayahs</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Ayahs you dwell on, play, or mark most often</p>
        {ayahs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Stay with an ayah and it will start to rise here.</p>
        ) : (
          <ol className="mt-4 flex-1 divide-y divide-line/60">
            {ayahs.map((item, index) => (
              <li key={item.verseKey} className="h-[4.25rem]">
                <Link
                  href={readerHref(item.verseKey)}
                  className="flex h-full items-center justify-between gap-3 rounded-2xl px-1 hover:bg-highlight"
                >
                  <span className="min-w-0">
                    <span className="mr-2 text-xs tabular-nums text-gold-deep">{index + 1}</span>
                    <span className="font-medium text-ink">{surahName(item.chapterId)}</span>
                    <span className="mt-0.5 block pl-5 text-xs text-ink-soft">Ayah {item.verseKey}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
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
  return `${count.toLocaleString("en-US")} time${count === 1 ? "" : "s"}`;
}
