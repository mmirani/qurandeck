"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { surahById } from "@/lib/guide/surahs";
import { nextSurahAction } from "@/lib/next-surah";

export function NextSurahLink({ chapterId }: { chapterId: number }) {
  const { chapters } = useMushaf();
  const action = nextSurahAction(
    chapterId,
    (id) => chapters.find((item) => item.id === id)?.nameSimple ?? surahById(id)?.name,
  );
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
