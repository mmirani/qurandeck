"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Plus, X } from "lucide-react";
import { useMushafEdgeInteraction } from "@/components/home/mushaf-edge-interaction";
import { MushafBook, MushafEdgeMagnifier } from "@/components/home/mushaf-book";
import { useMushafOwnerTitle } from "@/components/home/use-mushaf-owner-title";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";
import { buildMushafEdge, minShareForWidth, type MushafEdgeInput } from "@/lib/mushaf-edge";
import {
  EXPLORE_FILTER_ALL,
  PAN_DRAG_THRESHOLD_PX,
  PAN_ORIGIN,
  YAW_MAX,
  YAW_MIN,
  ZOOM_MIN,
  angleOf,
  canPan,
  clampPan,
  clampPose,
  colourShown,
  defaultPose,
  dragTurn,
  fitScale,
  heldPose,
  filterMushafInput,
  ignoresMushafKeys,
  keyboardPanDelta,
  keyboardTurnDirection,
  keyboardZoomSteps,
  maxZoomForView,
  panBoundsFromRects,
  panBy,
  resetZoom,
  scrubberLabel,
  shouldResetPan,
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
  type MushafPan,
  type MushafTurn,
  type MushafPose,
  type PanBounds,
} from "@/lib/mushaf-explore";
import type { SearchHit } from "@/lib/quran/types";

type MushafExploreDialogProps = {
  input: MushafEdgeInput;
  jumpToHit: (hit: SearchHit) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

type DragState = {
  x: number;
  y: number;
  originX: number;
  originY: number;
  pointer: number;
  mode: "pending" | "pan" | "turn";
  /** Where the hand has turned the book, before the limits push back. */
  turn: MushafTurn;
};

function fullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestNodeFullscreen(node: HTMLElement): Promise<void> {
  const anyNode = node as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  if (typeof node.requestFullscreen === "function") return node.requestFullscreen();
  if (typeof anyNode.webkitRequestFullscreen === "function") {
    return Promise.resolve(anyNode.webkitRequestFullscreen());
  }
  return Promise.reject(new Error("unsupported"));
}

function exitNodeFullscreen(): Promise<void> {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  if (fullscreenElement()) {
    if (typeof document.exitFullscreen === "function") return document.exitFullscreen();
    if (typeof doc.webkitExitFullscreen === "function") return Promise.resolve(doc.webkitExitFullscreen());
  }
  return Promise.resolve();
}

export function MushafExploreDialog({ input, jumpToHit, onClose, returnFocus }: MushafExploreDialogProps) {
  const titleId = useId();
  const title = useMushafOwnerTitle();
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const drag = useRef<DragState | null>(null);
  const [pose, setPose] = useState<MushafPose>(defaultPose);
  const [pan, setPan] = useState<MushafPan>(PAN_ORIGIN);
  const [filter, setFilter] = useState<ExploreFilter>(EXPLORE_FILTER_ALL);
  const [share, setShare] = useState(0);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);
  const [fit, setFit] = useState(1);
  const poseRef = useRef(pose);
  const panRef = useRef(pan);
  const boundsRef = useRef<PanBounds>({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const fullscreenRef = useRef(false);
  const cssFallbackRef = useRef(false);
  const maxZoom = maxZoomForView(fullscreen);
  const maxZoomRef = useRef(maxZoom);
  const interaction = useMushafEdgeInteraction(
    jumpToHit,
    `${pose.yaw.toFixed(1)}:${pose.pitch.toFixed(1)}:${pose.zoom}:${pan.x.toFixed(0)}:${pan.y.toFixed(0)}:${fullscreen}`,
    dialogRef,
  );
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

  const applyPan = (next: MushafPan) => {
    const clamped = clampPan(next, boundsRef.current);
    panRef.current = clamped;
    setPan(clamped);
  };

  const applyPose = (next: MushafPose, resetPan = false) => {
    const previous = poseRef.current;
    const finalPose = clampPose(next, maxZoomRef.current);
    poseRef.current = finalPose;
    setPose(finalPose);
    if (resetPan || shouldResetPan(previous.zoom, finalPose.zoom, false)) {
      panRef.current = PAN_ORIGIN;
      setPan(PAN_ORIGIN);
    }
  };

  useEffect(() => {
    poseRef.current = pose;
    panRef.current = pan;
    fullscreenRef.current = fullscreen;
    maxZoomRef.current = maxZoom;
    cssFallbackRef.current = cssFallback;
  }, [cssFallback, fullscreen, maxZoom, pan, pose]);

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
  }, [pose.zoom, fullscreen]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const scene = stage?.querySelector(".mushaf-scene");
    if (!stage || !(scene instanceof HTMLElement)) return;
    const measure = () => {
      // offset sizes ignore transforms, so this is the book's own box at 100%.
      const next = fitScale(
        { width: stage.clientWidth, height: stage.clientHeight },
        { width: scene.offsetWidth, height: scene.offsetHeight },
      );
      setFit((current) => (Math.abs(current - next) < 0.002 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(scene);
    window.addEventListener("orientationchange", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [fullscreen, angle]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const zoomBox = stage?.querySelector(".mushaf-zoom");
    const book = stage?.querySelector(".mushaf-float");
    if (!stage || !(book instanceof HTMLElement)) return;
    const measure = () => {
      const bounds = panBoundsFromRects(
        stage.getBoundingClientRect(),
        book.getBoundingClientRect(),
        panRef.current,
        poseRef.current.zoom,
      );
      boundsRef.current = bounds;
      const next = clampPan(panRef.current, bounds);
      if (Math.abs(next.x - panRef.current.x) > 0.5 || Math.abs(next.y - panRef.current.y) > 0.5) {
        panRef.current = next;
        setPan({ x: Math.round(next.x), y: Math.round(next.y) });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(book);
    // Zoom and fit animate, so measure again once the scale has settled.
    zoomBox?.addEventListener("transitionend", measure);
    return () => {
      observer.disconnect();
      zoomBox?.removeEventListener("transitionend", measure);
    };
  }, [angle, fit, fullscreen, pose.pitch, pose.yaw, pose.zoom]);

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
      if (fullscreenElement()) void exitNodeFullscreen();
      node?.focus();
    };
  }, [returnFocus]);

  useEffect(() => {
    const onChange = () => {
      const active = fullscreenElement() === dialogRef.current;
      if (active) {
        cssFallbackRef.current = false;
        setCssFallback(false);
        setFullscreen(true);
        return;
      }
      if (cssFallbackRef.current) return;
      setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // Entering or leaving full screen refits the book: 100% zoom, centred.
  useEffect(() => {
    setPose((current) => {
      const next = clampPose({ ...current, zoom: ZOOM_MIN }, maxZoomForView(fullscreen));
      poseRef.current = next;
      return next;
    });
    panRef.current = PAN_ORIGIN;
    setPan(PAN_ORIGIN);
  }, [fullscreen]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomed = canPan(poseRef.current.zoom);
      if ((event.ctrlKey || event.metaKey) || !zoomed) {
        applyPose(zoomFromWheel(poseRef.current, event.deltaY, maxZoomRef.current));
        return;
      }
      applyPan(panBy(panRef.current, -event.deltaX, -event.deltaY, boundsRef.current));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const enterFullscreen = async () => {
    const node = dialogRef.current;
    if (!node) return;
    try {
      await requestNodeFullscreen(node);
      fullscreenButtonRef.current?.focus();
    } catch {
      cssFallbackRef.current = true;
      setCssFallback(true);
      setFullscreen(true);
      fullscreenButtonRef.current?.focus();
    }
  };

  const leaveFullscreen = async () => {
    cssFallbackRef.current = false;
    setCssFallback(false);
    try {
      await exitNodeFullscreen();
    } catch {
      /* the CSS fallback still clears below */
    }
    setFullscreen(false);
    fullscreenButtonRef.current?.focus();
  };

  useEffect(() => {
    const root = dialogRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuOpenRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        if (fullscreenRef.current) {
          void leaveFullscreen();
          return;
        }
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
        applyPose(zoomBySteps(poseRef.current, zoom, maxZoomRef.current));
        return;
      }
      const stageFocused = document.activeElement === stageRef.current;
      if (stageFocused && canPan(poseRef.current.zoom)) {
        const delta = keyboardPanDelta(event.key);
        if (delta) {
          event.preventDefault();
          applyPan(panBy(panRef.current, delta.x, delta.y, boundsRef.current));
          return;
        }
      }
      const turn = keyboardTurnDirection(event.key);
      if (turn) {
        event.preventDefault();
        applyPose(turnBy(poseRef.current, turn, maxZoomRef.current));
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
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
      pointer: event.pointerId,
      mode: "pending",
      turn: { yaw: poseRef.current.yaw, pitch: poseRef.current.pitch },
    };
    stageRef.current?.focus();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.mode === "pending") {
      const travelled = Math.hypot(event.clientX - start.originX, event.clientY - start.originY);
      if (travelled < PAN_DRAG_THRESHOLD_PX) return;
      start.mode = canPan(poseRef.current.zoom) ? "pan" : "turn";
      setDragging(true);
    }
    start.x = event.clientX;
    start.y = event.clientY;
    if (dx === 0 && dy === 0) return;
    if (start.mode === "pan") {
      applyPan(panBy(panRef.current, dx, dy, boundsRef.current));
      return;
    }
    if (start.mode === "turn") {
      start.turn = dragTurn(start.turn, dx, dy);
      const held = heldPose(start.turn, poseRef.current.zoom, maxZoomRef.current);
      poseRef.current = held;
      setPose(held);
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    // Let go past a limit and the book eases back to it.
    if (start.mode === "turn") applyPose(poseRef.current);
  };

  const onDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, label")) return;
    event.preventDefault();
    applyPose(resetZoom(poseRef.current, maxZoomRef.current), true);
  };

  const chipClass = (pressed: boolean) =>
    `inline-flex h-11 min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
      pressed ? "border-gold bg-gold text-on-gold" : "border-line bg-surface text-ink"
    }`;

  return createPortal(
    <div className={`fixed inset-0 z-[70] flex items-center justify-center ${fullscreen && cssFallback ? "p-0" : "p-3 sm:p-4"}`}>
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-pointer bg-black/45" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="mushaf-explore-dialog"
        data-fullscreen={fullscreen ? "true" : "false"}
        className={`ornament-border paper-panel mushaf-explore-dialog relative z-10 flex h-[min(100dvh-1.5rem,52rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl outline-none${
          fullscreen ? " is-fullscreen" : ""
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/50 px-5 py-4">
          <div className="min-w-0">
            <p className="kufic-label text-gold-deep">Close-up</p>
            <h2 id={titleId} className="font-display text-3xl leading-tight font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Drag to turn. When zoomed, drag, scroll, or the arrow keys move the view. Double-click to reset. + and − zoom.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              ref={fullscreenButtonRef}
              type="button"
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
              aria-pressed={fullscreen}
              data-testid="mushaf-explore-fullscreen"
              onClick={() => (fullscreen ? void leaveFullscreen() : void enterFullscreen())}
              className="inline-flex h-11 min-h-11 w-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight"
            >
              {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
            </button>
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
          aria-label={`${title} on the desk. When zoomed, drag, scroll, or use arrow keys to move the view.`}
          className={`mushaf-explore-stage${angle === "fore-edge" ? " has-magnifier" : ""}${dragging ? " is-dragging" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={onDoubleClick}
        >
          <MushafBook
            edge={edge}
            pagesRef={pagesRef}
            variant="explore"
            pose={pose}
            pan={pan}
            fit={fit}
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
                onClick={() => applyPose(zoomBySteps(pose, -1, maxZoom))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="inline-flex h-11 min-w-16 items-center justify-center text-sm font-semibold text-ink tabular-nums" aria-hidden="true">
                {zoomLabel(pose.zoom, maxZoom)}
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={pose.zoom >= maxZoom}
                onClick={() => applyPose(zoomBySteps(pose, 1, maxZoom))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={pose.zoom === ZOOM_MIN}
                onClick={() => applyPose(resetZoom(pose, maxZoom), true)}
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
                onClick={() => applyPose(turnBy(pose, -1, maxZoom))}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-pressed={angle === "three-quarter"}
                onClick={() => applyPose(withAngle(pose, "three-quarter", maxZoom), true)}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                  angle === "three-quarter" ? "border-gold bg-gold text-on-gold" : "border-line text-ink hover:bg-highlight"
                }`}
              >
                Three-quarter
              </button>
              <button
                type="button"
                aria-pressed={angle === "fore-edge"}
                onClick={() => applyPose(withAngle(pose, "fore-edge", maxZoom), true)}
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
                onClick={() => applyPose(turnBy(pose, 1, maxZoom))}
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
