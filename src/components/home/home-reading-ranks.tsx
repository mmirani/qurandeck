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
    <>
      <RankCard title="Most read surahs" detail="Surahs you return to most">
        {surahs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Read a few surahs and they will rank here.</p>
        ) : (
          <ol className="mt-3 flex-1 divide-y divide-line/60">
            {surahs.map((item, index) => (
              <li key={item.chapterId}>
                <Link
                  href={`/surah/${item.chapterId}`}
                  className="flex min-h-11 items-center justify-between gap-2 py-1.5 hover:text-gold-deep"
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-1.5 text-xs tabular-nums text-gold-deep">{index + 1}</span>
                    <span className="text-sm font-medium text-ink">{surahName(item.chapterId)}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </RankCard>

      <RankCard title="Most read ayahs" detail="Ayahs you return to most">
        {ayahs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Stay with an ayah and it will start to rise here.</p>
        ) : (
          <ol className="mt-3 flex-1 divide-y divide-line/60">
            {ayahs.map((item, index) => (
              <li key={item.verseKey}>
                <Link
                  href={readerHref(item.verseKey)}
                  className="flex min-h-11 items-center justify-between gap-2 py-1.5 hover:text-gold-deep"
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-1.5 text-xs tabular-nums text-gold-deep">{index + 1}</span>
                    <span className="text-sm font-medium text-ink">
                      {surahName(item.chapterId)} · {item.verseKey}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">{formatVisits(item.visits)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </RankCard>
    </>
  );
}

function RankCard({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-line bg-surface px-4 py-4 sm:px-5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>
      {children}
    </section>
  );
}

function formatVisits(count: number) {
  return `${count.toLocaleString("en-US")}×`;
}
