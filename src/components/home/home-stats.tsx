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
  versesHint = `of ${formatCount(TOTAL_AYAHS)}`,
  surahsHint = `of ${TOTAL_SURAHS}`,
  streakHint,
  minutesHint,
  mushafPercent,
  mushafHint,
}: {
  versesRead: number | null;
  surahsFinished: number;
  streak: number;
  minutes: number | null;
  favorites: number;
  notes: number;
  highlights: number;
  versesHint?: string;
  surahsHint?: string;
  streakHint?: string;
  minutesHint?: string;
  mushafPercent: number;
  mushafHint?: string;
}) {
  return (
    <div className="qd-pad flex h-full flex-col justify-center rounded-3xl border border-line bg-surface">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:gap-x-8">
        <Stat icon={BookMarked} label="Ayahs read" value={versesRead} hint={versesHint} />
        <Stat icon={BookOpen} label="Surahs finished" value={surahsFinished} hint={surahsHint} />
        <Stat icon={CalendarDays} label="Day streak" value={streak} hint={streakHint} />
        <Stat icon={Clock} label="Minutes" value={minutes} hint={minutesHint} />
      </dl>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line/70 pt-6 sm:grid-cols-4 sm:gap-x-8">
        <Stat icon={Star} label="Favorites" value={favorites} iconClassName="fill-gold text-gold" />
        <Stat icon={NotebookPen} label="Notes" value={notes} />
        <Stat icon={Highlighter} label="Highlights" value={highlights} />
        <Stat icon={Map} label="Of mushaf" value={mushafPercent} suffix="%" hint={mushafHint} />
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
  value: number | null;
  hint?: string;
  suffix?: string;
  iconClassName?: string;
}) {
  const count = `${formatCount(value)}${value == null ? "" : (suffix ?? "")}`;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <Icon className={`h-6 w-6 shrink-0 ${iconClassName}`} aria-hidden="true" strokeWidth={1.75} />
        <span className="font-display text-[1.75rem] font-semibold leading-none text-ink tabular-nums">{count}</span>
      </div>
      <dt className="mt-2 text-sm font-medium leading-5 text-ink sm:text-[0.9375rem]">{label}</dt>
      <dd className={`mt-2 min-h-4 text-xs leading-4 ${hint ? "text-ink-soft" : "sr-only"}`}>
        {hint ?? label}
      </dd>
    </div>
  );
}

function formatCount(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}
