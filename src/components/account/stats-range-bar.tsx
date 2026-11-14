"use client";

import { useRef, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { RangeCalendar } from "@/components/account/range-calendar";
import { computeRangeStats, STATS_RANGE_OPTIONS, type StatsRangeId } from "@/lib/stats-range";

export function useRangeStats() {
  const { progress, notes, bookmarks, highlights, preferences } = useMushaf();
  return computeRangeStats({
    progress,
    notes,
    bookmarks,
    highlights,
    statsRange: preferences.statsRange,
    statsRangeStart: preferences.statsRangeStart,
    statsRangeEnd: preferences.statsRangeEnd,
  });
}

export function StatsRangeBar() {
  const { preferences, updatePreferences } = useMushaf();
  const stats = useRangeStats();
  const [open, setOpen] = useState(false);
  const customRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    customRef.current?.focus();
  };

  const choose = (id: StatsRangeId) => {
    if (id === "custom") {
      setOpen(true);
      return;
    }
    setOpen(false);
    updatePreferences({ statsRange: id });
  };

  return (
    <div className="flex flex-col gap-3" data-stats-range={preferences.statsRange}>
      <p className="text-sm text-ink-soft" aria-live="polite">
        {stats.range.label}
      </p>
      <div role="radiogroup" aria-label="Stats date range" className="flex flex-wrap gap-2">
        {STATS_RANGE_OPTIONS.map((option) => {
          const checked = option.id === "custom" ? open || preferences.statsRange === "custom" : !open && preferences.statsRange === option.id;
          return (
            <button
              key={option.id}
              ref={option.id === "custom" ? customRef : undefined}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => choose(option.id)}
              className={`min-h-11 cursor-pointer rounded-full px-3 text-sm font-medium ${
                checked ? "bg-gold text-on-gold" : "border border-line bg-surface text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {open ? (
        <RangeCalendar
          start={preferences.statsRange === "custom" ? preferences.statsRangeStart : null}
          end={preferences.statsRange === "custom" ? preferences.statsRangeEnd : null}
          onChange={(start, end) =>
            updatePreferences({ statsRange: "custom", statsRangeStart: start, statsRangeEnd: end })
          }
          onClose={close}
        />
      ) : null}
      {stats.historyHint ? <p className="text-xs leading-5 text-muted">{stats.historyHint}</p> : null}
    </div>
  );
}
