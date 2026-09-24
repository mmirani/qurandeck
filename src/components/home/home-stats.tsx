import { BookMarked, BookOpen, CalendarDays, Clock, Highlighter, Map, NotebookPen, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TOTAL_AYAHS, TOTAL_SURAHS } from "@/lib/reading";

export function HomeStats({
  versesRead,
  surahsFinished,
  streak,
  minutes,
  favorites,
  notes,
  highlights,
}: {
  versesRead: number;
  surahsFinished: number;
  streak: number;
  minutes: number;
  favorites: number;
  notes: number;
  highlights: number;
}) {
  const mushafPercent = Math.min(100, Math.round((versesRead / TOTAL_AYAHS) * 1000) / 10);

  return (
    <div className="flex h-full flex-col justify-center rounded-3xl border border-line bg-surface px-6 py-6 sm:px-8 sm:py-7">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:gap-x-8">
        <Stat icon={BookMarked} label="Ayahs read" value={versesRead} hint={`of ${formatCount(TOTAL_AYAHS)}`} />
        <Stat icon={BookOpen} label="Surahs finished" value={surahsFinished} hint={`of ${TOTAL_SURAHS}`} />
        <Stat icon={CalendarDays} label="Day streak" value={streak} />
        <Stat icon={Clock} label="Minutes" value={minutes} />
      </dl>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line/70 pt-6 sm:grid-cols-4 sm:gap-x-8">
        <Stat icon={Star} label="Favorites" value={favorites} iconClassName="fill-gold text-gold" />
        <Stat icon={NotebookPen} label="Notes" value={notes} />
        <Stat icon={Highlighter} label="Highlights" value={highlights} />
        <Stat icon={Map} label="Of mushaf" value={mushafPercent} suffix="%" />
      </dl>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  suffix,
  iconClassName = "text-gold",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
  iconClassName?: string;
}) {
  const count = `${formatCount(value)}${suffix ?? ""}`;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <Icon className={`h-6 w-6 shrink-0 ${iconClassName}`} aria-hidden="true" strokeWidth={1.75} />
        <span className="font-display text-[1.75rem] font-semibold leading-none text-ink tabular-nums">{count}</span>
      </div>
      <dt className="mt-2 text-sm font-medium text-ink sm:text-[0.9375rem]">{label}</dt>
      <dd className={`mt-0.5 min-h-4 text-xs leading-4 ${hint ? "text-ink-soft" : "sr-only"}`}>
        {hint ?? label}
      </dd>
    </div>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}
