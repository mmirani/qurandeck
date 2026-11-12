"use client";

import Link from "next/link";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { readerHref, topAyahsByVisits, topCompletedSurahs } from "@/lib/reading";

export function HomeReadingRanks() {
  const { progress, chapters, openSurah } = useMushaf();
  const surahs = topCompletedSurahs(progress, 5);
  const ayahs = topAyahsByVisits(progress, 5);
  if (surahs.length === 0 && ayahs.length === 0) return null;

  const surahName = (id: number) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`;

  return (
    <>
      <RankCard title="Surahs you finished" detail="Your own full readings. Not a score.">
        {surahs.length === 0 ? (
          <p className="text-sm leading-6 text-ink-soft">Finish a surah and it will show here.</p>
        ) : (
          <ol className="flex-1 divide-y divide-line/60">
            {surahs.map((item) => (
              <li key={item.chapterId}>
                <Link
                  href={`/surah/${item.chapterId}`}
                  className="qd-row hover:text-gold-deep"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{surahName(item.chapterId)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                    {formatCompletions(item.completions)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </RankCard>

      <RankCard title="Ayahs you return to" detail="Places you have spent time. Not a spiritual rank.">
        {ayahs.length === 0 ? (
          <p className="text-sm leading-6 text-ink-soft">Stay with an ayah and it will start to rise here.</p>
        ) : (
          <ol className="flex-1 divide-y divide-line/60">
            {ayahs.map((item) => (
              <li key={item.verseKey}>
                <Link
                  href={readerHref(item.verseKey)}
                  onClick={(event) => {
                    event.preventDefault();
                    openSurah(item.chapterId, item.verseNumber);
                  }}
                  className="qd-row hover:text-gold-deep"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-ink">
                    {surahName(item.chapterId)} · {item.verseKey}
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{formatVisits(item.visits)}</span>
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
    <section className="qd-card h-full min-h-0 rounded-3xl border border-line bg-surface">
      <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
      <p className="text-xs leading-5 text-ink-soft">{detail}</p>
      {children}
    </section>
  );
}

function formatCompletions(count: number) {
  return count === 1 ? "1 full read" : `${count.toLocaleString("en-US")} full reads`;
}

function formatVisits(count: number) {
  return count === 1 ? "1 time" : `${count.toLocaleString("en-US")} times`;
}
