"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dialogFocusables, trapTabIndex } from "@/lib/dialog-focus";
import { isFutureDay, parseDayKey, todayKey } from "@/lib/reading";
import { formatDay, formatSpan, monthMatrix, moveCalendarDay, weekStartsOn } from "@/lib/stats-range";
import { useMediaQuery } from "@/lib/use-media-query";

const EARLIEST = new Date(2000, 0, 1);

export function RangeCalendar({
  start,
  end,
  onChange,
  onClose,
}: {
  start: string | null;
  end: string | null;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const today = todayKey();
  const wide = useMediaQuery("(min-width: 768px)");
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const weekStart = weekStartsOn(typeof navigator === "undefined" ? "en-US" : navigator.language);
  const initial = parseDayKey(end || start || today) ?? new Date();
  const [visible, setVisible] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [focused, setFocused] = useState(end && end <= today ? end : start && start <= today ? start : today);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(start);
  const [rangeEnd, setRangeEnd] = useState(end);

  useEffect(() => {
    const node = rootRef.current?.querySelector<HTMLElement>(`[data-cal-day="${focused}"]`);
    node?.focus();
  }, [focused]);

  const months = [visible];
  if (wide) months.push(new Date(visible.getFullYear(), visible.getMonth() + 1, 1));
  const lastVisible = months[months.length - 1] ?? visible;
  const nextDisabled =
    lastVisible.getFullYear() > new Date().getFullYear() ||
    (lastVisible.getFullYear() === new Date().getFullYear() && lastVisible.getMonth() >= new Date().getMonth());
  const prevDisabled = visible.getFullYear() < EARLIEST.getFullYear() || (visible.getFullYear() === 2000 && visible.getMonth() === 0);

  const shiftVisible = (delta: number) => {
    setVisible((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const pick = (day: string) => {
    if (isFutureDay(day)) return;
    if (!anchor) {
      setAnchor(day);
      setRangeStart(day);
      setRangeEnd(null);
      setFocused(day);
      return;
    }
    const nextStart = anchor < day ? anchor : day;
    const nextEnd = anchor < day ? day : anchor;
    setRangeStart(nextStart);
    setRangeEnd(nextEnd);
    setAnchor(null);
    setFocused(day);
    onChange(nextStart, nextEnd);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      const root = rootRef.current;
      if (!root) return;
      const items = dialogFocusables(root);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const current = active ? items.indexOf(active) : -1;
      const outside = current < 0;
      const atStart = current <= 0;
      const atEnd = current === items.length - 1;
      if (!outside && event.shiftKey && !atStart) return;
      if (!outside && !event.shiftKey && !atEnd) return;
      event.preventDefault();
      items[trapTabIndex(current, items.length, event.shiftKey)]?.focus();
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target?.dataset.calDay) return;
    const next = moveCalendarDay(focused, event.key, weekStart);
    if (!next || isFutureDay(next)) return;
    event.preventDefault();
    setFocused(next);
    const date = parseDayKey(next);
    if (!date) return;
    const first = months[0] ?? visible;
    const last = months[months.length - 1] ?? visible;
    const before = date < new Date(first.getFullYear(), first.getMonth(), 1);
    const after = date > new Date(last.getFullYear(), last.getMonth() + 1, 0);
    if (before || after) setVisible(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const status =
    rangeStart && rangeEnd
      ? formatSpan(rangeStart, rangeEnd)
      : anchor
        ? `Start ${formatDay(anchor)}. Choose an end date.`
        : "Choose a start date, then an end date.";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="rounded-3xl border border-line bg-canvas p-3 outline-none sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          disabled={prevDisabled}
          onClick={() => shiftVisible(-1)}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-default"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h3 id={titleId} className="text-sm font-semibold text-ink">
          Custom range
        </h3>
        <button
          type="button"
          aria-label="Next month"
          disabled={nextDisabled}
          onClick={() => shiftVisible(1)}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-default"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
        {status}
      </p>
      <p className="sr-only">Arrow keys move between days. Home and End move within the week. Escape closes this calendar.</p>
      <div className={`mt-3 grid gap-6 ${wide ? "grid-cols-2" : "grid-cols-1"}`}>
        {months.map((month) => (
          <MonthGrid
            key={`${month.getFullYear()}-${month.getMonth()}`}
            month={month}
            weekStart={weekStart}
            today={today}
            focused={focused}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPick={pick}
            onFocusDay={setFocused}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-11 min-w-11 cursor-pointer rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function weekdayLabels(weekStart: number) {
  const sunday = new Date(2026, 10, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + ((weekStart + index) % 7));
    const narrow = new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date);
    const long = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
    return { narrow, long };
  });
}

function MonthGrid({
  month,
  weekStart,
  today,
  focused,
  rangeStart,
  rangeEnd,
  onPick,
  onFocusDay,
}: {
  month: Date;
  weekStart: number;
  today: string;
  focused: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  onPick: (day: string) => void;
  onFocusDay: (day: string) => void;
}) {
  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
  const rows = monthMatrix(month.getFullYear(), month.getMonth(), weekStart);
  const headings = weekdayLabels(weekStart);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const long = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <h4 className="mb-2 text-center text-sm font-medium text-ink">{label}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19.25rem] border-separate border-spacing-0" role="grid" aria-label={label}>
          <thead>
            <tr>
              {headings.map((heading) => (
                <th key={heading.long} scope="col" className="h-8 text-center text-xs font-medium text-muted" abbr={heading.long}>
                  {heading.narrow}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("-")}>
                {row.map((day) => {
                  const date = parseDayKey(day);
                  const future = isFutureDay(day);
                  const outside = !day.startsWith(monthKey);
                  const endpoint = day === rangeStart || day === rangeEnd;
                  const inRange = Boolean(rangeStart && rangeEnd && day >= rangeStart && day <= rangeEnd);
                  const name = date ? long.format(date) : day;
                  let accessible = name;
                  if (day === today) accessible += ", today";
                  if (future) accessible += ", unavailable";
                  if (endpoint && rangeStart === rangeEnd) accessible += ", selected";
                  else if (day === rangeStart) accessible += ", start of range";
                  else if (day === rangeEnd) accessible += ", end of range";
                  else if (inRange) accessible += ", in range";
                  return (
                    <td key={day} role="gridcell" className="p-0 text-center" aria-selected={endpoint || undefined}>
                      <button
                        type="button"
                        data-cal-day={future ? undefined : day}
                        tabIndex={day === focused && !future ? 0 : -1}
                        disabled={future}
                        aria-disabled={future || undefined}
                        aria-current={day === today ? "date" : undefined}
                        aria-pressed={endpoint || undefined}
                        aria-label={accessible}
                        onClick={() => onPick(day)}
                        onFocus={() => onFocusDay(day)}
                        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed ${
                          future
                            ? "text-muted opacity-40"
                            : endpoint
                              ? "bg-gold font-semibold text-on-gold"
                              : inRange
                                ? "bg-highlight text-ink"
                                : outside
                                  ? "cursor-pointer text-muted"
                                  : "cursor-pointer text-ink hover:bg-highlight"
                        } ${day === today && !endpoint ? "ring-1 ring-gold" : ""}`}
                      >
                        {date?.getDate()}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
