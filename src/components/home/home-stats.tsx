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
    <div className="rounded-3xl border border-line bg-surface px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat icon={BookMarked} label="Ayahs read" value={versesRead} hint={`of ${formatCount(TOTAL_AYAHS)}`} />
        <Stat icon={BookOpen} label="Surahs finished" value={surahsFinished} hint={`of ${TOTAL_SURAHS}`} />
        <Stat icon={CalendarDays} label="Day streak" value={streak} />
        <Stat icon={Clock} label="Minutes" value={minutes} />
      </dl>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line/70 pt-3 sm:grid-cols-4">
        <Stat icon={Star} label="Favorites" value={favorites} iconClassName="fill-gold text-gold" />
        <Stat icon={NotebookPen} label="Notes" value={notes} />
        <Stat icon={Highlighter} label="Highlights" value={highlights} marked />
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
  marked = false,
  iconClassName = "text-gold",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
  marked?: boolean;
  iconClassName?: string;
}) {
  const count = `${formatCount(value)}${suffix ?? ""}`;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
        {marked ? (
          <span className="rounded-md bg-[#F5D76E] px-1.5 py-0.5 font-display text-xl font-semibold leading-none text-[#1c140c] tabular-nums">
            {count}
          </span>
        ) : (
          <span className="font-display text-xl font-semibold leading-none text-ink tabular-nums">{count}</span>
        )}
      </div>
      <dt className="mt-1 text-xs font-medium text-ink">{label}</dt>
      {hint ? <dd className="text-[11px] leading-4 text-ink-soft">{hint}</dd> : <dd className="sr-only">{label}</dd>}
    </div>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}
