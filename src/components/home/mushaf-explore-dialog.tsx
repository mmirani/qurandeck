"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useMushafEdgeInteraction } from "@/components/home/mushaf-edge-interaction";
import { MushafBook, MushafEdgeMagnifier } from "@/components/home/mushaf-book";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";
import { buildMushafEdge, minShareForWidth, type MushafEdgeInput } from "@/lib/mushaf-edge";
import {
  EXPLORE_FILTER_ALL,
  YAW_MAX,
  YAW_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  angleOf,
  colourShown,
  defaultPose,
  dragPose,
  filterMushafInput,
  ignoresMushafKeys,
  keyboardTurnDirection,
  keyboardZoomSteps,
  resetZoom,
  scrubberLabel,
  surahAtShare,
  toggleBookmarks,
  toggleColour,
  toggleNotes,
  turnBy,
  withAngle,
  zoomBySteps,
  zoomFromWheel,
  zoomLabel,
  type ExploreFilter,
  type MushafPose,
} from "@/lib/mushaf-explore";
import type { SearchHit } from "@/lib/quran/types";

type MushafExploreDialogProps = {
  input: MushafEdgeInput;
  jumpToHit: (hit: SearchHit) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function MushafExploreDialog({ input, jumpToHit, onClose, returnFocus }: MushafExploreDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const [pose, setPose] = useState<MushafPose>(defaultPose);
  const [filter, setFilter] = useState<ExploreFilter>(EXPLORE_FILTER_ALL);
  const [share, setShare] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const interaction = useMushafEdgeInteraction(jumpToHit, `${pose.yaw.toFixed(1)}:${pose.pitch.toFixed(1)}:${pose.zoom}`);
  const { dismiss, menuOpen } = interaction;
  const menuOpenRef = useRef(false);

  const full = useMemo(() => buildMushafEdge(input), [input]);
  const edge = useMemo(
    () =>
      buildMushafEdge({
        ...filterMushafInput(input, filter),
        minShare: minShareForWidth(width),
        minFlagGap: width > 0 ? Math.max(0.04, 6 / width) : undefined,
      }),
    [filter, input, width],
  );
  const spot = surahAtShare(full.bands, share);
  const angle = angleOf(pose);

  useEffect(() => {
    const node = pagesRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pose.zoom]);

  useEffect(() => {
    onCloseRef.current = onClose;
    menuOpenRef.current = menuOpen;
  }, [menuOpen, onClose]);

  useEffect(() => {
    dismiss();
  }, [dismiss, filter]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = returnFocus.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      node?.focus();
    };
  }, [returnFocus]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setPose((current) => zoomFromWheel(current, event.deltaY));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const root = dialogRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuOpenRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (menuOpenRef.current) return;
      if (event.key === "Tab") {
        if (!root) return;
        const items = dialogFocusables(root);
        if (items.length === 0) {
          event.preventDefault();
          root.focus();
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
      if (ignoresMushafKeys(event.target)) return;
      const zoom = keyboardZoomSteps(event.key);
      if (zoom) {
        event.preventDefault();
        setPose((current) => zoomBySteps(current, zoom));
        return;
      }
      const turn = keyboardTurnDirection(event.key);
      if (turn) {
        event.preventDefault();
        setPose((current) => turnBy(current, turn));
      }
    };
    document.addEventListener("keydown", onKey, true);
    const items = root ? dialogFocusables(root) : [];
    const closeIndex = items.findIndex((item) => item.hasAttribute("data-dialog-close"));
    const initial = initialDialogIndex(items.length, closeIndex);
    if (initial >= 0) items[initial]?.focus();
    else root?.focus();
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, label")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    setDragging(true);
    stageRef.current?.focus();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start.x = event.clientX;
    start.y = event.clientY;
    if (dx === 0 && dy === 0) return;
    setPose((current) => dragPose(current, dx, dy));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const chipClass = (pressed: boolean) =>
    `inline-flex h-11 min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
      pressed ? "border-gold bg-gold text-on-gold" : "border-line bg-surface text-ink"
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">,
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-pointer bg-black/45" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="mushaf-explore-dialog"
        className="ornament-border paper-panel relative z-10 flex h-[min(100dvh-1.5rem,52rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl outline-none"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/50 px-5 py-4">
          <div className="min-w-0">
            <p className="kufic-label text-gold-deep">Close-up</p>
            <h2 id={titleId} className="font-display text-3xl leading-tight font-semibold text-ink">
              Your Mushaf
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Drag to turn. Scroll or + and − to zoom. Arrow keys turn the book.
            </p>
          </div>
          <button
            type="button"
            data-dialog-close
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {full.legend.length > 0 || full.totals.notes > 0 || full.totals.bookmarks > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-line/50 px-5 py-3" role="group" aria-label="Show marks">
            {full.legend.map((color) => {
              const pressed = colourShown(filter, color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={`${color.name}, ${color.count} ${color.count === 1 ? "highlight" : "highlights"}`}
                  className={chipClass(pressed)}
                  onClick={() => setFilter((current) => toggleColour(current, color.id))}
                >
                  <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-line" style={{ backgroundColor: color.color }} />
                  <span>{color.name}</span>
                </button>
              );
            })}
            {full.totals.notes > 0 ? (
              <button
                type="button"
                aria-pressed={filter.showNotes}
                className={chipClass(filter.showNotes)}
                onClick={() => setFilter((current) => toggleNotes(current))}
              >
                Notes
              </button>
            ) : null}
            {full.totals.bookmarks > 0 ? (
              <button
                type="button"
                aria-pressed={filter.showBookmarks}
                className={chipClass(filter.showBookmarks)}
                onClick={() => setFilter((current) => toggleBookmarks(current))}
              >
                Bookmarks
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          ref={stageRef}
          tabIndex={0}
          data-testid="mushaf-explore-stage"
          aria-label="Closed mushaf on the desk"
          className="mushaf-explore-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <MushafBook
            edge={edge}
            pagesRef={pagesRef}
            variant="explore"
            pose={pose}
            dragging={dragging}
            spotlight={share}
            tipId={interaction.tipId}
            menuId={interaction.menuId}
            activeTipId={interaction.activeTipId}
            activeMenuId={interaction.activeMenuId}
            handlers={interaction.handlers}
          />
        </div>

        {angle === "fore-edge" ? (
          <MushafEdgeMagnifier
            edge={edge}
            spotlight={share}
            tipId={interaction.tipId}
            menuId={interaction.menuId}
            activeTipId={interaction.activeTipId}
            activeMenuId={interaction.activeMenuId}
            handlers={interaction.handlers}
          />
        ) : null}

        <div className="flex shrink-0 flex-col gap-3 border-t border-line/50 px-5 py-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div role="group" aria-label="Zoom" className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={pose.zoom <= ZOOM_MIN}
                onClick={() => setPose((current) => zoomBySteps(current, -1))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="inline-flex h-11 min-w-16 items-center justify-center text-sm font-semibold text-ink tabular-nums" aria-hidden="true">
                {zoomLabel(pose.zoom)}
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={pose.zoom >= ZOOM_MAX}
                onClick={() => setPose((current) => zoomBySteps(current, 1))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={pose.zoom === ZOOM_MIN}
                onClick={() => setPose((current) => resetZoom(current))}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                Reset zoom
              </button>
            </div>
            <div role="group" aria-label="Turn the book" className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Turn left"
                disabled={pose.yaw <= YAW_MIN}
                onClick={() => setPose((current) => turnBy(current, -1))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-pressed={angle === "three-quarter"}
                onClick={() => setPose((current) => withAngle(current, "three-quarter"))}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                  angle === "three-quarter" ? "border-gold bg-gold text-on-gold" : "border-line text-ink hover:bg-highlight"
                }`}
              >
                Three-quarter
              </button>
              <button
                type="button"
                aria-pressed={angle === "fore-edge"}
                onClick={() => setPose((current) => withAngle(current, "fore-edge"))}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                  angle === "fore-edge" ? "border-gold bg-gold text-on-gold" : "border-line text-ink hover:bg-highlight"
                }`}
              >
                Fore-edge
              </button>
              <button
                type="button"
                aria-label="Turn right"
                disabled={pose.yaw >= YAW_MAX}
                onClick={() => setPose((current) => turnBy(current, 1))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between gap-3 text-sm text-ink">
              <span>Along the pages</span>
              <span className="font-medium">{scrubberLabel(spot)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(share * 1000)}
              data-testid="mushaf-explore-scrubber"
              aria-label="Surah along the page edge"
              aria-valuetext={scrubberLabel(spot)}
              className="mushaf-scrubber"
              onChange={(event) => setShare(Number(event.target.value) / 1000)}
            />
          </label>
          <p className="text-center text-xs text-ink-soft">
            Al-Fatihah is at the front cover. An-Nas is at the back. The line marks the surah under the scrubber.
          </p>
        </div>
        {interaction.popovers}
      </div>
    </div>,
    document.body,
  );
}
