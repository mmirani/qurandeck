"use client";

import { SaveCardButton, useCanShare } from "@/components/finish/save-card-button";
import type { FinishedReading } from "@/lib/finished-reading";
import { formatKeepsakeDate } from "@/lib/keepsake-card";

export function FinishedReadingsList({ readings }: { readings: FinishedReading[] }) {
  const share = useCanShare();
  if (readings.length === 0) return null;
  const sorted = [...readings].sort((a, b) => a.index - b.index);

  return (
    <section className="qd-card rounded-3xl border border-line bg-surface" data-testid="readings-finished">
      <p className="kufic-label text-gold-deep">Readings finished</p>
      <p className="text-sm leading-6 text-ink-soft">
        Dates and how long each reading took, kept in your synced library.
      </p>
      <ul className="flex flex-col gap-3">
        {sorted.map((reading) => (
          <li
            key={reading.id}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-tight text-ink">Reading {reading.index}</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Started {formatKeepsakeDate(reading.startedOn)} · Finished {formatKeepsakeDate(reading.finishedOn)} ·{" "}
                {reading.days.toLocaleString("en-US")} {reading.days === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveCardButton reading={reading} variant="quiet" />
              {share ? (
                <SaveCardButton reading={reading} label="Send to family or a friend" variant="quiet" share />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
