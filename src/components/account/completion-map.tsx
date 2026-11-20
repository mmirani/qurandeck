"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { CompletionViewport } from "@/components/account/completion-viewport";
import { barGlow, barWarmth, buildReadIndex, noorGlow, sliverPaint, type ReadIndex, type SurahName } from "@/lib/completion-map";
import { dialogFocusables, trapTabIndex } from "@/lib/dialog-focus";
import { TOTAL_AYAHS, ayahIndex, finishedSurahIds, parseVerseKey, quranPieceMap, TOTAL_SURAHS } from "@/lib/reading";

const COARSE_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeCoarse(callback: () => void) {
  const query = window.matchMedia(COARSE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Phones and tablets get a tap-to-explore preview; mouse and trackpad get the map inline. */
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}

const DESKTOP_HINT = "Ctrl or ⌘ + scroll to zoom · drag or Shift + scroll to move · click a sliver";
const TOUCH_HINT = "Pinch to zoom · swipe to move · tap a sliver";

export function CompletionMap() {
  const { progress, chapters, jumpToHit, closeModal } = useMushaf();
  const coarse = useCoarsePointer();
  const [exploring, setExploring] = useState(false);
  const exploreButton = useRef<HTMLButtonElement>(null);
  const read = useMemo(() => buildReadIndex(progress.versesRead), [progress.versesRead]);
  const map = useMemo(() => quranPieceMap(progress.versesRead), [progress.versesRead]);
  const finished = useMemo(() => finishedSurahIds(progress).length, [progress]);
  const name = useCallback<SurahName>(
    (id) => chapters.find((item) => item.id === id)?.nameSimple ?? `Surah ${id}`,
    [chapters],
  );
  const placeAyah = useMemo(() => {
    const place = parseVerseKey(progress.lastVerseKey);
    const index = place ? ayahIndex(place.chapterId, place.verseNumber) : -1;
    return index >= 0 ? index : undefined;
  }, [progress.lastVerseKey]);

  const open = useCallback(
    (verseKey: string) => {
      const place = parseVerseKey(verseKey);
      if (!place) return;
      setExploring(false);
      closeModal();
      jumpToHit({
        verseKey,
        chapterId: place.chapterId,
        verseNumber: place.verseNumber,
        textArabic: "",
        textTranslation: "Quran completion",
        source: "jump",
      });
    },
    [closeModal, jumpToHit],
  );

  return (
    <section className="qd-card rounded-3xl border border-line bg-surface" data-testid="completion-map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kufic-label text-gold-deep">Quran completion</p>
          <p className="max-w-3xl text-sm leading-6 text-ink-soft">
            A map of the ayahs you have read, in any order, from Al-Fatihah to An-Nas. Zoom in from the whole Quran to
            each surah and each ayah. Slices fill with light as you read, and a finished surah shines.
          </p>
        </div>
        <button
          ref={exploreButton}
          type="button"
          onClick={() => setExploring(true)}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-highlight"
        >
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
          {coarse ? "Explore" : "Full screen"}
        </button>
      </div>

      {coarse ? (
        <CoarsePreview read={read} onExplore={() => setExploring(true)} />
      ) : (
        <CompletionViewport
          read={read}
          versesRead={progress.versesRead}
          name={name}
          onOpen={open}
          variant="inline"
          hint={DESKTOP_HINT}
        />
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
        <p data-testid="completion-summary">
          {read.total} of {TOTAL_AYAHS} ayahs · {map.percent}% of the mushaf · {finished} of {TOTAL_SURAHS} surahs finished
        </p>
        <p>
          {map.scattered
            ? `${map.uniqueSurahs} surahs in pieces — every speck still counts`
            : map.filled
              ? `${map.filled} of ${map.pieceCount} slices have light`
              : "Stay on an ayah for a few seconds to light the first slice"}
        </p>
      </div>

      {exploring ? (
        <CompletionExplorer
          read={read}
          versesRead={progress.versesRead}
          name={name}
          onOpen={open}
          onClose={() => setExploring(false)}
          returnFocus={exploreButton}
          hint={coarse ? TOUCH_HINT : DESKTOP_HINT}
          initialAyah={placeAyah}
          summary={`${read.total} of ${TOTAL_AYAHS} ayahs · ${map.percent}% · ${finished} surahs finished`}
        />
      ) : null}
    </section>
  );
}

/** Phone and tablet: the whole bar as one big target that opens the explorer. */
function CoarsePreview({ read, onExplore }: { read: ReadIndex; onExplore: () => void }) {
  const map = useMemo(() => {
    const out: number[] = [];
    for (let piece = 0; piece < 80; piece += 1) {
      const start = Math.floor((piece * TOTAL_AYAHS) / 80);
      const end = Math.floor(((piece + 1) * TOTAL_AYAHS) / 80);
      out.push(end > start ? (read.prefix[end] - read.prefix[start]) / (end - start) : 0);
    }
    return out;
  }, [read]);
  const backdrop = barGlow(barWarmth(read));
  return (
    <button
      type="button"
      onClick={onExplore}
      data-testid="completion-preview"
      aria-label={`Quran completion map, ${read.total} of ${TOTAL_AYAHS} ayahs read. Open the explorer to zoom in.`}
      className="completion-panel relative flex h-16 w-full cursor-pointer items-stretch gap-px overflow-hidden rounded-2xl p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
      style={{
        background: `linear-gradient(to bottom, color-mix(in srgb, var(--map-bloom) ${backdrop.top}%, var(--map-base)), color-mix(in srgb, var(--map-bloom) ${backdrop.bottom}%, var(--map-base)) 55%, color-mix(in srgb, var(--map-bloom) ${backdrop.bottom}%, var(--map-base)))`,
        boxShadow: backdrop.halo > 0 ? `0 0 ${backdrop.haloBlur}px color-mix(in srgb, var(--map-bloom) ${backdrop.halo}%, transparent)` : undefined,
      }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 flex gap-px blur-[6px]">
        {map.map((fill, index) => {
          const glow = noorGlow(fill, fill >= 1);
          return (
            <span
              key={index}
              className="min-w-0 flex-1 rounded-full"
              style={{ background: glow ? "var(--map-bloom)" : "transparent", opacity: glow?.opacity ?? 0, transform: glow ? `scale(${1 + glow.spread / 6}, 1.25)` : undefined }}
            />
          );
        })}
      </span>
      {map.map((fill, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="relative min-w-0 flex-1 rounded-[2px]"
          style={{
            background: sliverPaint(fill, fill >= 1),
          }}
        />
      ))}
    </button>
  );
}

type ExplorerProps = {
  read: ReadIndex;
  versesRead: readonly string[];
  name: SurahName;
  onOpen: (verseKey: string) => void;
  onClose: () => void;
  returnFocus: React.RefObject<HTMLElement | null>;
  hint: string;
  initialAyah?: number;
  summary: string;
};

function CompletionExplorer({ read, versesRead, name, onOpen, onClose, returnFocus, hint, initialAyah, summary }: ExplorerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = returnFocus.current;
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      node?.focus();
    };
  }, [returnFocus]);

  useEffect(() => {
    const root = dialogRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Escape inside the sliver popover closes only the popover (it handles its own).
        if (event.target instanceof Element && event.target.closest('[data-testid="completion-popover"]')) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = dialogFocusables(root);
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const atEdge = current < 0 || (event.shiftKey ? current === 0 : current === items.length - 1);
      if (!atEdge) return;
      event.preventDefault();
      items[trapTabIndex(current, items.length, event.shiftKey)]?.focus();
    };
    root?.addEventListener("keydown", onKey);
    return () => root?.removeEventListener("keydown", onKey);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="completion-explorer"
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-surface text-ink"
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kufic-label text-gold-deep">Quran completion</p>
            <h2 id={titleId} className="font-display text-2xl leading-tight font-semibold text-ink sm:text-3xl">
              Your map of the Quran
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{summary}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-highlight"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <CompletionViewport
          read={read}
          versesRead={versesRead}
          name={name}
          onOpen={onOpen}
          variant="explorer"
          initialAyah={initialAyah}
          hint={hint}
        />
        <div className="pb-44" aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
