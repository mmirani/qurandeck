"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { isQuranFinished, pendingFinishedReading } from "@/lib/finished-reading";
import { formatKeepsakeDate } from "@/lib/keepsake-card";

const SANA_WIDTH = 72;
const SANA_HEIGHT = (72 * 444) / 512; // uniform scale of 512×444

export function FinishSanaNote() {
  const { progress, startNewReadingCycle } = useMushaf();
  if (!isQuranFinished(progress)) return null;
  const latest = [...(progress.finishedReadings ?? [])].sort((a, b) => a.index - b.index).at(-1);
  const pending = pendingFinishedReading(progress);
  const reading = pending ?? latest;
  if (!reading) return null;

  return (
    <div className="mt-4 flex flex-col items-start gap-3 rounded-[18px] border border-line/80 bg-highlight/70 px-2.5 py-2.5 sm:flex-row sm:items-center sm:gap-3.5" data-testid="finish-sana-note">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/companion/nur.png"
        alt=""
        width={SANA_WIDTH}
        height={SANA_HEIGHT}
        className="shrink-0"
        style={{ width: SANA_WIDTH, height: SANA_HEIGHT }}
      />
      <div className="min-w-0 flex-1">
        <p className="kufic-label text-gold-deep">Sana</p>
        <p className="text-sm font-medium leading-6 text-ink">You finished the Quran. May Allah accept it.</p>
        <p className="text-sm leading-6 text-ink-soft">
          Start a new reading and this map is kept as Reading {reading.index}, finished{" "}
          {formatKeepsakeDate(reading.finishedOn)}. Notes and highlights stay.
        </p>
      </div>
      <button
        type="button"
        onClick={startNewReadingCycle}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
      >
        Start a new reading
      </button>
    </div>
  );
}
