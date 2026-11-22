"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { SaveCardButton, useCanShare } from "@/components/finish/save-card-button";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";
import { pendingFinishedReading, type FinishedReading } from "@/lib/finished-reading";
import { formatKeepsakeDate } from "@/lib/keepsake-card";

const SLIVERS = 80;

function subscribeReduced(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/qd-mark.png" alt="" width={28} height={28} />
      <span className="text-[1.05rem] font-bold tracking-[-0.03em]">QuranDeck</span>
    </div>
  );
}

function FinishMap({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className={`finish-map${reduceMotion ? " is-static" : ""}`} data-testid="finish-map">
      <div className="finish-map-panel">
        <div className="finish-map-bloom" aria-hidden="true">
          {Array.from({ length: SLIVERS }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="finish-map-slivers" aria-hidden="true">
          {Array.from({ length: SLIVERS }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-ink-soft">
        <span>Al-Fatihah</span>
        <span>An-Nas</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-ink-soft">
        6,236 of 6,236 ayahs · 100% of the mushaf · 114 of 114 surahs finished
      </p>
    </div>
  );
}

export function FinishMoment() {
  const { progress, hydrated, keepFinishedMap, startNewReadingCycle } = useMushaf();
  const pathname = usePathname();
  const pending = hydrated ? pendingFinishedReading(progress) : null;
  const reduceMotion = useReducedMotion();
  const [gate, setGate] = useState<"wait" | "ready" | "home-only">("wait");
  const share = useCanShare();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  if (hydrated && gate === "wait") {
    setGate(pending && pathname !== "/" ? "home-only" : "ready");
  }
  const open = Boolean(hydrated && pending && (gate === "ready" || (gate === "home-only" && pathname === "/")));

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        keepFinishedMap();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = dialogFocusables(root);
      if (items.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const current = active ? items.indexOf(active) : -1;
      const atStart = current <= 0;
      const atEnd = current === items.length - 1;
      if (current >= 0 && event.shiftKey && !atStart) return;
      if (current >= 0 && !event.shiftKey && !atEnd) return;
      event.preventDefault();
      items[trapTabIndex(current, items.length, event.shiftKey)]?.focus();
    };
    document.addEventListener("keydown", onKey);
    const items = root ? dialogFocusables(root) : [];
    const closeIndex = items.findIndex((item) => item.hasAttribute("data-dialog-close"));
    const initial = initialDialogIndex(items.length, closeIndex);
    if (initial >= 0) items[initial]?.focus();
    else root?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, keepFinishedMap]);

  if (!open || !pending) return null;
  return <FinishMomentView reading={pending} reduceMotion={reduceMotion} share={share} titleId={titleId} dialogRef={dialogRef} onKeep={keepFinishedMap} onStart={startNewReadingCycle} />;
}

function FinishMomentView({
  reading,
  reduceMotion,
  share,
  titleId,
  dialogRef,
  onKeep,
  onStart,
}: {
  reading: FinishedReading;
  reduceMotion: boolean;
  share: boolean;
  titleId: string;
  dialogRef: RefObject<HTMLDivElement | null>;
  onKeep: () => void;
  onStart: () => void;
}) {
  return (
    <div className="finish-moment" data-testid="finish-moment">
      <div className="finish-moment-screen">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <button
            type="button"
            data-dialog-close
            aria-label="Close"
            onClick={onKeep}
            className="inline-flex h-11 min-h-11 w-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-start py-3 sm:justify-center sm:py-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-[54rem] outline-none"
          >
            <p className="kufic-label text-center text-gold-deep">Quran completion</p>
            <h2 id={titleId} className="finish-moment-title mt-2 text-center sm:mt-3">
              You finished the Quran
            </h2>
            <p className="mt-2 text-center text-base font-medium leading-6 text-ink-soft sm:mt-3 sm:text-lg sm:leading-7">May Allah accept it.</p>
            <div className="mt-4 sm:mt-8">
              <FinishMap reduceMotion={reduceMotion} />
            </div>
            <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-line/80 bg-surface/90 px-4 py-3 text-center">
                <p className="kufic-label text-gold-deep">Days taken</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{reading.days.toLocaleString("en-US")} days</p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-surface/90 px-4 py-3 text-center">
                <p className="kufic-label text-gold-deep">Started</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{formatKeepsakeDate(reading.startedOn)}</p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-surface/90 px-4 py-3 text-center">
                <p className="kufic-label text-gold-deep">Ayahs read</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink">{reading.ayahs.toLocaleString("en-US")}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onKeep}
                className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-on-gold sm:w-auto sm:min-w-[10.5rem]"
              >
                Keep my map
              </button>
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-6 text-sm font-semibold text-ink sm:w-auto sm:min-w-[10.5rem]"
              >
                Start again
              </button>
              <SaveCardButton reading={reading} variant="secondary" className="w-full sm:w-auto sm:min-w-[10.5rem]" />
              {share ? <SaveCardButton reading={reading} label="Send to family or a friend" variant="quiet" share className="w-full sm:w-auto" /> : null}
            </div>
            <p className="mx-auto mt-3 max-w-xl text-center text-xs leading-5 text-muted sm:mt-5">
              Keep my map leaves the glow as it is. Start again begins a new reading and keeps this one in your synced
              library as Reading {reading.index}, finished {formatKeepsakeDate(reading.finishedOn)}. Notes and highlights
              stay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
