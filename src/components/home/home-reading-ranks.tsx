"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { rankPage, readerHref, topAyahsByVisits, topCompletedSurahs } from "@/lib/reading";

/** Rows per page; the card stays the same size as before. */
const PAGE_SIZE = 5;
/** Ayah visits can run into thousands; the list keeps the 50 most returned to. */
const AYAH_LIMIT = 50;

export function HomeReadingRanks() {
  const { progress, chapters, openSurah } = useMushaf();
  const [surahPageIndex, setSurahPage] = useState(0);
  const [ayahPageIndex, setAyahPage] = useState(0);
  const allSurahs = topCompletedSurahs(progress, Number.POSITIVE_INFINITY);
  const allAyahs = topAyahsByVisits(progress, AYAH_LIMIT);
  if (allSurahs.length === 0 && allAyahs.length === 0) return null;
  const surahPage = rankPage(allSurahs, surahPageIndex, PAGE_SIZE);
  const ayahPage = rankPage(allAyahs, ayahPageIndex, PAGE_SIZE);
  const surahs = surahPage.items;
  const ayahs = ayahPage.items;

  const surahName = (id: number) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`;

  return (
    <>
      <RankCard
        title="Surahs you finished"
        detail="Your own full readings. Not a score."
        pager={<Pager label="Surahs you finished" page={surahPage.page} pages={surahPage.pages} onPage={setSurahPage} />}
      >
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

      <RankCard
        title="Ayahs you return to"
        detail="Places you have spent time. Not a spiritual rank."
        pager={<Pager label="Ayahs you return to" page={ayahPage.page} pages={ayahPage.pages} onPage={setAyahPage} />}
      >
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
  pager,
  children,
}: {
  title: string;
  detail: string;
  pager?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="qd-card h-full min-h-0 rounded-3xl border border-line bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-ink">{title}</h3>
          <p className="text-xs leading-5 text-ink-soft">{detail}</p>
        </div>
        {pager}
      </div>
      {children}
    </section>
  );
}

/** Small previous/next control in the card header; hidden when everything fits on one page. */
function Pager({
  label,
  page,
  pages,
  onPage,
}: {
  label: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const button =
    "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-gold/10 hover:text-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-soft";
  return (
    <nav aria-label={`${label} pages`} className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        className={button}
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-9 text-center text-xs tabular-nums text-ink-soft" aria-live="polite">
        {page + 1} / {pages}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onPage(page + 1)}
        disabled={page >= pages - 1}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}

function formatCompletions(count: number) {
  return count === 1 ? "1 full read" : `${count.toLocaleString("en-US")} full reads`;
}

function formatVisits(count: number) {
  return count === 1 ? "1 time" : `${count.toLocaleString("en-US")} times`;
}
