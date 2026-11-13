"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { surahById } from "@/lib/guide/surahs";
import { nextSurahAction, showPreviousSurah } from "@/lib/next-surah";

function surahName(chapters: { id: number; nameSimple: string }[], id: number) {
  return chapters.find((item) => item.id === id)?.nameSimple ?? surahById(id)?.name;
}

/** One row at the end of a surah: secondary Previous, primary named Next. Surah 1 hides Previous. */
export function SurahPager({ chapterId }: { chapterId: number }) {
  const { chapters } = useMushaf();
  const next = nextSurahAction(chapterId, (id) => surahName(chapters, id));
  const previous = showPreviousSurah(chapterId);

  return (
    <nav aria-label="Surah" className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]">
      {previous ? (
        <Link
          href={`/surah/${chapterId - 1}`}
          className="inline-flex h-11 min-h-11 min-w-max flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Previous surah
        </Link>
      ) : null}
      <Link
        href={`/surah/${next.id}`}
        className="inline-flex h-11 min-h-11 min-w-max flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
      >
        {next.label}
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </nav>
  );
}

/** Single primary control on the last ayah. The scroll reader uses SurahPager instead. */
export function NextSurahLink({ chapterId }: { chapterId: number }) {
  const { chapters } = useMushaf();
  const action = nextSurahAction(chapterId, (id) => surahName(chapters, id));
  return (
    <Link
      href={`/surah/${action.id}`}
      className="mt-[var(--space-4)] flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-[var(--space-4)] text-sm font-semibold text-on-gold"
    >
      {action.label}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
