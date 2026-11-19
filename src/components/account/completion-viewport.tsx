"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import {
  AYAH_PRESET_PPA,
  SLICE_STARTS,
  SURAH_PRESET_PPA,
  ZOOM_STEP,
  ayahTickEvery,
  barGlow,
  barWarmth,
  centreOn,
  clampView,
  isZoomed,
  levelForPpa,
  litRuns,
  MAX_PPA,
  minPpa,
  noorGlow,
  panBy,
  revealSpan,
  surahFinished,
  unitAt,
  unitCount,
  unitDetails,
  unitFill,
  unitIndexForAyah,
  unitLabel,
  unitsInSpan,
  wheelZoomFactor,
  wholeView,
  zoomAt,
  type CompletionLevel,
  type CompletionView,
  type ReadIndex,
  type SurahName,
} from "@/lib/completion-map";
import { COMPLETION_PIECES, SURAH_VERSE_COUNTS, TOTAL_AYAHS, ayahAtIndex, ayahsReadInSurah } from "@/lib/reading";

/** Theme tokens that cycle by surah so neighbouring chapters can read apart. */
const SURAH_TONES = ["var(--gold)", "var(--chip-alt)", "var(--accent)"] as const;
const LEVEL_NAMES: Record<CompletionLevel, string> = { quran: "Whole Quran", surah: "Surahs", ayah: "Ayahs" };
const DRAG_THRESHOLD = { mouse: 4, touch: 8 } as const;

function tone(chapterId: number) {
  return SURAH_TONES[(chapterId - 1) % SURAH_TONES.length];
}

const UNREAD = "color-mix(in srgb, var(--line) 30%, var(--canvas))";

/** Surah level: paint the lit runs in place so the reader sees where in the surah they have read. */
function surahPaint(chapterId: number, runs: [number, number][] | null, fill: number) {
  if (fill <= 0) return UNREAD;
  if (!runs || fill >= 1) return sliverFill("surah", chapterId, fill);
  const lit = tone(chapterId);
  const base = UNREAD;
  const stops: string[] = [];
  for (const [a, b] of runs) {
    const from = (a * 100).toFixed(2);
    const to = (b * 100).toFixed(2);
    stops.push(`${base} ${from}%`, `${lit} ${from}%`, `${lit} ${to}%`, `${base} ${to}%`);
  }
  return `linear-gradient(to right, ${base} 0%, ${stops.join(", ")}, ${base} 100%)`;
}

function sliverFill(level: CompletionLevel, chapterId: number, fill: number) {
  if (fill <= 0) return UNREAD;
  if (level === "ayah") return tone(chapterId);
  const strength = Math.round(28 + fill * 72);
  return `color-mix(in srgb, ${tone(chapterId)} ${strength}%, var(--canvas))`;
}

/** Lit slivers look lit from within: a warm top light over the fill; finished ones lean towards noor. */
function litPaint(paint: string, chapterId: number, fill: number, finished: boolean, level: CompletionLevel) {
  if (fill <= 0) return paint;
  if (finished) {
    const glowFill = `color-mix(in srgb, ${tone(chapterId)} 58%, var(--noor))`;
    return `linear-gradient(to bottom, color-mix(in srgb, #fff8e1 55%, transparent), transparent 55%), ${
      level === "surah" ? `linear-gradient(${glowFill}, ${glowFill})` : glowFill
    }`;
  }
  return `linear-gradient(to bottom, color-mix(in srgb, var(--noor) ${Math.round(20 + fill * 30)}%, transparent), transparent 60%), ${paint}`;
}

function litRing(fill: number, finished: boolean) {
  if (fill <= 0) return undefined;
  return finished
    ? "inset 0 0 0 1px color-mix(in srgb, var(--noor) 85%, transparent), inset 0 1px 0 color-mix(in srgb, #fffbeb 80%, transparent)"
    : "inset 0 1px 0 color-mix(in srgb, var(--noor) 45%, transparent)";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SliverProps = {
  level: CompletionLevel;
  index: number;
  left: number;
  width: number;
  fill: number;
  chapterId: number;
  finished: boolean;
  label: string;
  tabbable: boolean;
  selected: boolean;
  paint: string;
};

const Sliver = memo(function Sliver({ level, index, left, width, fill, finished, label, tabbable, selected, paint }: SliverProps) {
  return (
    <button
      type="button"
      data-index={index}
      data-level={level}
      data-fill={fill > 0 ? (fill >= 1 ? "full" : "part") : "none"}
      data-finished={finished ? "true" : undefined}
      aria-label={label}
      aria-pressed={selected}
      tabIndex={tabbable ? 0 : -1}
      className="completion-sliver absolute top-0 bottom-0 cursor-pointer rounded-[3px] p-0 outline-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] aria-pressed:z-10 aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[var(--gold-deep)]"
      style={{
        left,
        width: Math.max(width, 0.5),
        background: paint,
        boxShadow: litRing(fill, finished),
      }}
    />
  );
});

type Gesture = {
  pointers: Map<number, { x: number; y: number }>;
  mode: "idle" | "pending" | "pan" | "pinch";
  pointerType: string;
  startX: number;
  startView: CompletionView;
  pinchDist: number;
  pinchMidX: number;
  lastX: number;
  lastT: number;
  velocity: number;
  moved: boolean;
};

export type CompletionViewportProps = {
  read: ReadIndex;
  versesRead: readonly string[];
  name: SurahName;
  onOpen: (verseKey: string) => void;
  variant: "inline" | "explorer";
  /** Ayah index to centre on when the view first opens zoomed. */
  initialAyah?: number;
  /** Starting zoom in pixels per ayah. Default: the whole Quran. */
  initialPpa?: number;
  hint: string;
};

export function CompletionViewport({
  read,
  versesRead,
  name,
  onOpen,
  variant,
  initialAyah,
  initialPpa,
  hint,
}: CompletionViewportProps) {
  const popoverTitleId = useId();
  const statusId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setViewState] = useState<CompletionView>({ start: 0, ppa: 0.1 });
  const viewRef = useRef(view);
  const widthRef = useRef(0);
  const frame = useRef<number | null>(null);
  const animation = useRef<number | null>(null);
  const gesture = useRef<Gesture>({
    pointers: new Map(),
    mode: "idle",
    pointerType: "mouse",
    startX: 0,
    startView: view,
    pinchDist: 0,
    pinchMidX: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    moved: false,
  });
  const [dragging, setDragging] = useState(false);
  const [focusAyah, setFocusAyah] = useState(0);
  const [selected, setSelected] = useState<{ level: CompletionLevel; index: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const pendingFocus = useRef(false);
  const trackHadFocus = useRef(false);
  const ready = width > 0;

  const level = levelForPpa(view.ppa);
  const span = ready ? width / view.ppa : TOTAL_AYAHS;

  const commit = useCallback((next: CompletionView) => {
    const clamped = clampView(next, widthRef.current);
    viewRef.current = clamped;
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setViewState(viewRef.current);
    });
  }, []);

  /** Where a running ease is heading, so quick repeated presses build on it. */
  const heading = useRef<CompletionView | null>(null);
  /** Bumped on every stop, so a frame from an older glide or ease can never run again. */
  const animationToken = useRef(0);
  const stopAnimation = () => {
    if (animation.current != null) cancelAnimationFrame(animation.current);
    animation.current = null;
    heading.current = null;
    animationToken.current += 1;
  };
  const settledView = () => heading.current ?? viewRef.current;

  /** Ease to a view (buttons and keys). Instant when the reader prefers less motion. */
  const animateTo = useCallback(
    (target: CompletionView) => {
      stopAnimation();
      const to = clampView(target, widthRef.current);
      if (prefersReducedMotion()) {
        commit(to);
        return;
      }
      heading.current = to;
      const from = viewRef.current;
      const token = animationToken.current;
      let began = -1;
      const step = (now: number) => {
        if (token !== animationToken.current) return;
        if (began < 0) began = now;
        const t = Math.min(1, (now - began) / 200);
        const ease = 1 - (1 - t) ** 3;
        const ppa = Math.exp(Math.log(from.ppa) + (Math.log(to.ppa) - Math.log(from.ppa)) * ease);
        const start = from.start + (to.start - from.start) * ease;
        commit({ start, ppa });
        animation.current = t < 1 ? requestAnimationFrame(step) : null;
        if (t >= 1) heading.current = null;
      };
      animation.current = requestAnimationFrame(step);
    },
    [commit],
  );

  // Measure, and keep the same ayah in the middle when the width changes.
  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const measure = () => {
      const next = node.clientWidth;
      if (!next || next === widthRef.current) return;
      const previous = widthRef.current;
      widthRef.current = next;
      let target: CompletionView;
      if (!previous) {
        const ppa = initialPpa ?? minPpa(next);
        target = initialAyah != null ? centreOn({ start: 0, ppa }, initialAyah, next) : { start: 0, ppa };
      } else if (!isZoomed(viewRef.current, previous)) {
        target = wholeView(next);
      } else {
        const centre = viewRef.current.start + previous / viewRef.current.ppa / 2;
        target = centreOn(viewRef.current, centre, next);
      }
      const clamped = clampView(target, next);
      viewRef.current = clamped;
      setWidth(next);
      setViewState(clamped);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [initialAyah, initialPpa]);

  useEffect(
    () => () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      stopAnimation();
    },
    [],
  );

  const zoomBy = useCallback(
    (factor: number, anchorX?: number) => {
      const current = heading.current ?? viewRef.current;
      const w = widthRef.current;
      animateTo(zoomAt(current, current.ppa * factor, anchorX ?? w / 2, w));
    },
    [animateTo],
  );

  const anchorForAyah = (ayah: number) => {
    const current = settledView();
    const x = (ayah - current.start) * current.ppa;
    return x >= 0 && x <= widthRef.current ? x : widthRef.current / 2;
  };

  const goToLevel = (target: CompletionLevel) => {
    const w = widthRef.current;
    if (target === "quran") {
      animateTo(wholeView(w));
      return;
    }
    // In the touch explorer an ayah cell opens at the full 44 px+ target size.
    const ppa = target === "surah" ? SURAH_PRESET_PPA : variant === "explorer" ? MAX_PPA : AYAH_PRESET_PPA;
    const current = settledView();
    const focusX = (focusAyah - current.start) * current.ppa;
    const centre = focusX >= 0 && focusX <= w ? focusAyah : current.start + w / current.ppa / 2;
    animateTo(centreOn({ start: 0, ppa }, centre, w));
  };

  // Wheel: Ctrl/⌘ (and trackpad pinch) zooms on the cursor; Shift or a sideways swipe pans.
  // A plain vertical wheel is left to the page so the map never traps scrolling.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        stopAnimation();
        setSelected(null);
        const current = viewRef.current;
        commit(zoomAt(current, current.ppa * wheelZoomFactor(event.deltaY, event.deltaMode), x, widthRef.current));
        return;
      }
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = event.shiftKey ? event.deltaY || event.deltaX : sideways ? event.deltaX : 0;
      if (!delta && variant !== "explorer") return;
      const amount = delta || event.deltaY;
      if (!isZoomed(viewRef.current, widthRef.current)) return;
      event.preventDefault();
      stopAnimation();
      setSelected(null);
      const pixels = event.deltaMode === 1 ? amount * 16 : amount;
      commit(panBy(viewRef.current, -pixels, widthRef.current));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [commit, variant]);

  /* ---------- pointer: drag to pan, pinch to zoom ---------- */

  const localX = (clientX: number) => clientX - (viewportRef.current?.getBoundingClientRect().left ?? 0);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const g = gesture.current;
    stopAnimation();
    if (g.pointers.size === 0) g.moved = false;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.pointerType = event.pointerType;
    if (g.pointers.size === 1) {
      g.mode = "pending";
      g.startX = event.clientX;
      g.startView = viewRef.current;
      g.lastX = event.clientX;
      g.lastT = event.timeStamp;
      g.velocity = 0;
    } else if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.mode = "pinch";
      g.moved = true;
      g.pinchDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      g.pinchMidX = localX((a.x + b.x) / 2);
      g.startView = viewRef.current;
      setSelected(null);
      setDragging(true);
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (event.pointerType === "mouse" && g.pointers.size === 0) {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
      const index = target ? Number(target.dataset.index) : null;
      if (index !== hover) setHover(index);
      return;
    }
    if (!g.pointers.has(event.pointerId)) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const w = widthRef.current;
    if (g.mode === "pinch" && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const midX = localX((a.x + b.x) / 2);
      const start = g.startView;
      const ppa = start.ppa * (dist / g.pinchDist);
      const anchorAyah = start.start + g.pinchMidX / start.ppa;
      const zoomed = zoomAt({ start: anchorAyah - g.pinchMidX / start.ppa, ppa: start.ppa }, ppa, g.pinchMidX, w);
      commit(panBy(zoomed, midX - g.pinchMidX, w));
      return;
    }
    const dx = event.clientX - g.startX;
    if (g.mode === "pending") {
      const threshold = event.pointerType === "touch" ? DRAG_THRESHOLD.touch : DRAG_THRESHOLD.mouse;
      if (Math.abs(dx) < threshold) return;
      g.mode = "pan";
      g.moved = true;
      setSelected(null);
      setHover(null);
      setDragging(true);
      try {
        viewportRef.current?.setPointerCapture(event.pointerId);
      } catch {
        /* capture is a nicety */
      }
    }
    if (g.mode === "pan") {
      const dt = Math.max(1, event.timeStamp - g.lastT);
      g.velocity = 0.8 * ((event.clientX - g.lastX) / dt) + 0.2 * g.velocity;
      g.lastX = event.clientX;
      g.lastT = event.timeStamp;
      commit(panBy(g.startView, dx, w));
    }
  };

  const glide = (velocity: number) => {
    stopAnimation();
    if (prefersReducedMotion() || Math.abs(velocity) < 0.15) return;
    const token = animationToken.current;
    let speed = Math.max(-4, Math.min(4, velocity));
    let last = -1;
    const step = (now: number) => {
      if (token !== animationToken.current) return;
      const dt = last < 0 ? 16 : Math.min(32, now - last);
      last = now;
      speed *= Math.pow(0.94, dt / 16);
      commit(panBy(viewRef.current, speed * dt, widthRef.current));
      animation.current = Math.abs(speed) > 0.02 ? requestAnimationFrame(step) : null;
    };
    animation.current = requestAnimationFrame(step);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers.has(event.pointerId)) return;
    g.pointers.delete(event.pointerId);
    if (g.mode === "pinch" && g.pointers.size === 1) {
      // One finger left: carry on as a pan from here.
      const [rest] = [...g.pointers.values()];
      g.mode = "pan";
      g.startX = rest.x;
      g.startView = viewRef.current;
      g.lastX = rest.x;
      g.velocity = 0;
      return;
    }
    if (g.pointers.size > 0) return;
    const wasPan = g.mode === "pan";
    g.mode = "idle";
    setDragging(false);
    if (wasPan && event.type === "pointerup" && event.timeStamp - g.lastT < 80) glide(g.velocity);
  };

  /* ---------- slivers on screen ---------- */

  // At ayah level only a window around the view is rendered; it moves in whole chunks so
  // panning inside a chunk changes one transform and nothing else.
  const chunk = Math.max(1, Math.ceil(span));
  const winFrom = level === "ayah" ? Math.max(0, (Math.floor(view.start / chunk) - 1) * chunk) : 0;
  const winTo = level === "ayah" ? Math.min(TOTAL_AYAHS, winFrom + chunk * 4) : TOTAL_AYAHS;
  const units = useMemo(() => unitsInSpan(level, winFrom, winTo), [level, winFrom, winTo]);
  const ppa = view.ppa;
  const gap = level === "ayah" ? (ppa >= 20 ? 2 : 1) : level === "surah" ? (ppa >= 1.5 ? 1 : 0) : ready && (width / COMPLETION_PIECES) >= 3 ? 1 : 0;

  const visibleFirst = unitIndexForAyah(level, view.start);
  const visibleLast = unitIndexForAyah(level, view.start + span - 1e-6);
  const focusUnit = unitIndexForAyah(level, focusAyah);
  const tabbableUnit = focusUnit >= visibleFirst && focusUnit <= visibleLast ? focusUnit : visibleFirst;

  const unitData = useMemo(
    () =>
      units.map((unit) => {
        const place = ayahAtIndex(unit.start);
        const chapterId = place?.chapterId ?? 1;
        const fill = unitFill(read, unit);
        const finished = unit.level !== "quran" ? surahFinished(read, chapterId) : fill >= 1;
        const runs = unit.level === "surah" && fill > 0 && fill < 1 ? litRuns(read, unit.start, unit.end) : null;
        const base = unit.level === "surah" ? surahPaint(chapterId, runs, fill) : sliverFill(unit.level, chapterId, fill);
        const paint = litPaint(base, chapterId, fill, finished, unit.level);
        return { unit, chapterId, fill, finished, paint, runs, label: unitLabel(unit, read, name) };
      }),
    [units, read, name],
  );

  // Noor: one blurred layer of soft light behind the slivers. Each lit stretch adds a pill of
  // light that reaches past its edges; the layer is blurred once, never per cell.
  const blooms = useMemo(() => {
    const out: { key: string; left: number; width: number; spread: number; opacity: number }[] = [];
    if (!ready) return out;
    for (const { unit, fill, finished, runs } of unitData) {
      const glow = noorGlow(fill, finished);
      if (!glow) continue;
      const x = (unit.start - winFrom) * ppa;
      const w = Math.max(1, (unit.end - unit.start) * ppa - gap);
      if (runs && runs.length) {
        runs.forEach(([a, b], i) => {
          const runGlow = noorGlow(Math.min(1, 0.6 + fill), false)!;
          out.push({ key: `${unit.index}-${i}`, left: x + a * w, width: Math.max(1, (b - a) * w), spread: runGlow.spread, opacity: runGlow.opacity });
        });
      } else {
        out.push({ key: `${unit.index}`, left: x, width: w, spread: glow.spread, opacity: glow.opacity });
      }
    }
    return out;
  }, [unitData, ready, winFrom, ppa, gap]);

  // Move keyboard focus once the newly focused sliver is on the page.
  // A zoom that changes level swaps every sliver; if the focused one went with it, focus its successor.
  useLayoutEffect(() => {
    const lost = trackHadFocus.current && (!document.activeElement || document.activeElement === document.body);
    if (!pendingFocus.current && !lost) return;
    const node = trackRef.current?.querySelector<HTMLElement>(`[data-level="${level}"][data-index="${focusUnit}"]`);
    if (node) {
      pendingFocus.current = false;
      node.focus({ preventScroll: true });
    }
  });

  const moveFocus = (nextUnit: number) => {
    const count = unitCount(level);
    const index = Math.max(0, Math.min(count - 1, nextUnit));
    const unit = unitAt(level, index);
    setFocusAyah(unit.start);
    setSelected(null);
    const revealed = revealSpan(viewRef.current, unit.start, unit.end, widthRef.current);
    if (revealed !== viewRef.current) commit(revealed);
    // Focus now when the sliver is already on the page; otherwise once it renders.
    const node = trackRef.current?.querySelector<HTMLElement>(`[data-level="${level}"][data-index="${index}"]`);
    if (node) node.focus({ preventScroll: true });
    else pendingFocus.current = true;
  };

  const onTrackKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    const current = target ? Number(target.dataset.index) : focusUnit;
    switch (event.key) {
      case "Escape":
        if (hover != null) {
          event.preventDefault();
          event.stopPropagation();
          setHover(null);
        }
        return;
      case "ArrowRight":
        event.preventDefault();
        moveFocus(current + 1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(current - 1);
        return;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        return;
      case "End":
        event.preventDefault();
        moveFocus(unitCount(level) - 1);
        return;
      case "+":
      case "=":
      case "-":
      case "_": {
        event.preventDefault();
        const unit = unitAt(level, current);
        setFocusAyah(unit.start);
        pendingFocus.current = true;
        setSelected(null);
        const anchor = anchorForAyah((unit.start + unit.end) / 2);
        zoomBy(event.key === "+" || event.key === "=" ? ZOOM_STEP : 1 / ZOOM_STEP, anchor);
        return;
      }
      default:
    }
  };

  const select = (index: number) => {
    const unit = unitAt(level, index);
    setFocusAyah(unit.start);
    setHover(null);
    setSelected({ level, index });
  };

  const onTrackClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (gesture.current.moved) {
      gesture.current.moved = false;
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!target) return;
    const index = Number(target.dataset.index);
    if (selected && selected.level === level && selected.index === index) {
      setSelected(null);
      return;
    }
    select(index);
  };

  // The popover belongs to the level it was opened at.
  const openUnit = selected && selected.level === level ? unitAt(level, selected.index) : null;
  const details = useMemo(() => {
    if (!openUnit) return null;
    const chapterId = ayahAtIndex(openUnit.start)?.chapterId ?? 1;
    return unitDetails(openUnit, read, name, ayahsReadInSurah({ versesRead: versesRead as string[] }, chapterId));
  }, [openUnit, read, name, versesRead]);

  useEffect(() => {
    if (details) popoverRef.current?.querySelector<HTMLElement>("[data-primary]")?.focus({ preventScroll: true });
    // Focus moves once per opened sliver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.level, selected?.index]);

  const closePopover = (returnFocus: boolean) => {
    setSelected(null);
    if (returnFocus) pendingFocus.current = true;
  };

  const stepPopover = (delta: number) => {
    if (!openUnit) return;
    const index = Math.max(0, Math.min(unitCount(level) - 1, openUnit.index + delta));
    const unit = unitAt(level, index);
    setFocusAyah(unit.start);
    setSelected({ level, index });
    const revealed = revealSpan(viewRef.current, unit.start, unit.end, widthRef.current);
    if (revealed !== viewRef.current) animateTo(revealed);
  };

  const screenX = (ayah: number) => (ayah - view.start) * ppa;
  const popoverWidth = Math.min(300, Math.max(0, width - 8));
  const popoverLeft = openUnit
    ? Math.max(0, Math.min(width - popoverWidth, screenX((openUnit.start + openUnit.end) / 2) - popoverWidth / 2))
    : 0;

  const hoverUnit = hover != null && !dragging && !openUnit ? unitAt(level, hover) : null;
  const hoverLabel = hoverUnit ? unitLabel(hoverUnit, read, name) : "";
  const tooltipWidth = 260;
  const hoverLeft = hoverUnit
    ? Math.max(0, Math.min(width - tooltipWidth, screenX((hoverUnit.start + hoverUnit.end) / 2) - tooltipWidth / 2))
    : 0;

  /* ---------- ruler, overview, warmth ---------- */

  const ruler = useMemo(() => {
    const marks: { key: string; left: number; width: number; text: string; strong: boolean }[] = [];
    if (level === "quran") return marks;
    if (level === "surah") {
      for (const { unit, chapterId } of unitData) {
        const w = (unit.end - unit.start) * ppa;
        if (w < 22) continue;
        const text = w >= 110 ? `${chapterId} ${name(chapterId)}` : String(chapterId);
        marks.push({ key: `s${chapterId}`, left: (unit.start - winFrom) * ppa, width: w - 4, text, strong: w >= 110 });
      }
      return marks;
    }
    const every = ayahTickEvery(ppa);
    for (const { unit } of unitData) {
      const place = ayahAtIndex(unit.start);
      if (!place) continue;
      if (place.verseNumber === 1) {
        marks.push({
          key: `s${place.chapterId}`,
          left: (unit.start - winFrom) * ppa,
          width: 160,
          text: `${place.chapterId} ${name(place.chapterId)}`,
          strong: true,
        });
      } else if (place.verseNumber % every === 0 && ppa * every >= 22) {
        marks.push({
          key: `a${unit.start}`,
          left: (unit.start - winFrom) * ppa,
          width: Math.max(ppa, 22),
          text: String(place.verseNumber),
          strong: false,
        });
      }
    }
    return marks;
  }, [level, unitData, ppa, winFrom, name]);

  // Keep the name of the surah that runs off the left edge in view, so the reader always knows where they are.
  const sticky = (() => {
    if (level === "quran" || !ready) return null;
    const first = ayahAtIndex(Math.floor(view.start));
    if (!first || first.verseNumber === 1) return null;
    const surahStart = view.start - (first.verseNumber - 1) - (view.start % 1);
    const surahEnd = surahStart + SURAH_VERSE_COUNTS[first.chapterId - 1];
    const edge = (view.start - winFrom) * ppa + 6;
    const room = (surahEnd - view.start) * ppa - 12;
    if (room < 48) return null;
    const label = `${first.chapterId} ${name(first.chapterId)}`;
    return { left: edge, width: Math.min(room, 180), text: label };
  })();
  const stickyRight = sticky ? sticky.left + Math.min(sticky.width, sticky.text.length * 7.2 + 8) : -Infinity;

  const overview = useMemo(
    () =>
      Array.from({ length: COMPLETION_PIECES }, (_, piece) => {
        const start = SLICE_STARTS[piece];
        const end = SLICE_STARTS[piece + 1];
        const chapterId = ayahAtIndex(start)?.chapterId ?? 1;
        return { piece, background: sliverFill("quran", chapterId, unitFill(read, { start, end })) };
      }),
    [read],
  );
  const zoomed = ready && isZoomed(view, width);
  const windowLeft = (view.start / TOTAL_AYAHS) * 100;
  const windowWidth = Math.min(100, (span / TOTAL_AYAHS) * 100);

  const overviewRef = useRef<HTMLDivElement>(null);
  const overviewDrag = useRef(false);
  const overviewTo = (clientX: number) => {
    const rect = overviewRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const ayah = ((clientX - rect.left) / rect.width) * TOTAL_AYAHS;
    stopAnimation();
    setSelected(null);
    commit(centreOn(viewRef.current, ayah, widthRef.current));
  };

  const warmth = barWarmth(read);
  const backdrop = barGlow(warmth);
  const explorer = variant === "explorer";
  const barHeight = explorer ? "h-36 sm:h-40" : "h-16";
  const canZoomIn = view.ppa < MAX_PPA - 1e-6;
  const canZoomOut = zoomed;

  const firstVisible = ayahAtIndex(Math.floor(view.start));
  const lastVisible = ayahAtIndex(Math.min(TOTAL_AYAHS - 1, Math.floor(view.start + span - 1e-6)));
  const rangeText =
    firstVisible && lastVisible
      ? firstVisible.chapterId === lastVisible.chapterId
        ? `${name(firstVisible.chapterId)}${level === "ayah" ? ` ${firstVisible.chapterId}:${firstVisible.verseNumber}–${lastVisible.verseNumber}` : ""}`
        : `${name(firstVisible.chapterId)} to ${name(lastVisible.chapterId)}`
      : "";

  const controlButton =
    "inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none";

  return (
    <div className="flex flex-col gap-3" data-testid={`completion-view-${variant}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Zoom level" className="inline-flex rounded-full border border-line bg-surface p-0.5">
          {(Object.keys(LEVEL_NAMES) as CompletionLevel[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={level === id}
              onClick={() => goToLevel(id)}
              className="h-11 min-w-11 cursor-pointer rounded-full px-3.5 text-sm font-medium text-ink-soft transition-colors aria-pressed:bg-gold aria-pressed:text-on-gold motion-reduce:transition-none sm:px-4"
            >
              {LEVEL_NAMES[id]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Zoom out" className={controlButton} disabled={!canZoomOut} onClick={() => zoomBy(1 / ZOOM_STEP)}>
            <Minus aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Zoom in" className={controlButton} disabled={!canZoomIn} onClick={() => zoomBy(ZOOM_STEP)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={overviewRef}
        aria-hidden="true"
        data-testid="completion-overview"
        className={`relative flex h-6 cursor-pointer touch-none items-center ${zoomed ? "" : "invisible"}`}
        onPointerDown={(event) => {
          overviewDrag.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          overviewTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (overviewDrag.current) overviewTo(event.clientX);
        }}
        onPointerUp={() => {
          overviewDrag.current = false;
        }}
        onPointerCancel={() => {
          overviewDrag.current = false;
        }}
      >
        <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-line/70">
          {overview.map((item) => (
            <span key={item.piece} className="h-full min-w-0 flex-1" style={{ background: item.background }} />
          ))}
        </div>
        <span
          data-testid="completion-overview-window"
          className="pointer-events-none absolute top-0 bottom-0 rounded-md border-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--surface)_25%,transparent)]"
          style={{ left: `${windowLeft}%`, width: `max(${windowWidth}%, 6px)` }}
        />
      </div>

      <div className="relative">
        <div
          ref={viewportRef}
          data-testid="completion-viewport"
          data-level={level}
          data-ppa={view.ppa.toFixed(3)}
          data-start={view.start.toFixed(2)}
          data-focus-ayah={focusAyah}
          className={`completion-viewport relative ${barHeight} select-none overflow-hidden rounded-2xl ${
            dragging ? "cursor-grabbing" : zoomed ? "cursor-grab" : ""
          } ${explorer ? "touch-none" : "touch-pan-y"}`}
          style={{
            background: `linear-gradient(to bottom, color-mix(in srgb, var(--noor) ${backdrop.top}%, var(--map-base)), color-mix(in srgb, var(--noor) ${backdrop.bottom}%, var(--map-base)))`,
            boxShadow: backdrop.halo > 0 ? `0 0 ${backdrop.haloBlur}px color-mix(in srgb, var(--noor) ${backdrop.halo}%, transparent)` : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setHover(null);
          }}
        >
          <div
            ref={trackRef}
            role="group"
            aria-label={`Quran completion map, ${LEVEL_NAMES[level].toLowerCase()} view. Arrow keys move, plus and minus zoom, Enter opens.`}
            aria-describedby={statusId}
            className="absolute inset-x-0 top-4 bottom-8 will-change-transform"
            style={{ transform: `translate3d(${(winFrom - view.start) * ppa}px, 0, 0)` }}
            onKeyDown={onTrackKeyDown}
            onClick={onTrackClick}
            onFocus={() => {
              trackHadFocus.current = true;
            }}
            onBlur={(event) => {
              const target = event.target;
              if (event.relatedTarget || target.isConnected) trackHadFocus.current = false;
            }}
          >
            <div
              aria-hidden="true"
              data-testid="completion-noor"
              className="pointer-events-none absolute inset-0 will-change-transform"
              style={{ filter: `blur(${explorer ? 9 : 7}px)` }}
            >
              {blooms.map((bloom) => (
                <span
                  key={bloom.key}
                  className="absolute rounded-full"
                  style={{
                    left: bloom.left - bloom.spread,
                    width: bloom.width + bloom.spread * 2,
                    top: -bloom.spread,
                    bottom: -bloom.spread * 0.6,
                    opacity: bloom.opacity,
                    background: "var(--noor)",
                  }}
                />
              ))}
            </div>
            {ready
              ? unitData.map(({ unit, chapterId, fill, finished, label, paint }) => (
                  <Sliver
                    key={`${level}-${unit.index}`}
                    level={level}
                    index={unit.index}
                    left={(unit.start - winFrom) * ppa}
                    width={(unit.end - unit.start) * ppa - gap}
                    fill={fill}
                    chapterId={chapterId}
                    finished={finished}
                    label={label}
                    paint={paint}
                    tabbable={unit.index === tabbableUnit}
                    selected={Boolean(openUnit && openUnit.index === unit.index)}
                  />
                ))
              : null}
            <div aria-hidden="true" className="pointer-events-none absolute top-full left-0 h-6">
              {sticky ? (
                <span
                  className="absolute top-1 overflow-hidden text-xs leading-4 font-semibold whitespace-nowrap text-ellipsis text-ink"
                  style={{ left: sticky.left, maxWidth: sticky.width }}
                >
                  {sticky.text}
                </span>
              ) : null}
              {ruler
                .filter((mark) => mark.left > stickyRight || mark.left + mark.width < (sticky?.left ?? 0))
                .map((mark) => (
                <span
                  key={mark.key}
                  className={`absolute top-1 overflow-hidden text-xs leading-4 whitespace-nowrap text-ellipsis ${
                    mark.strong ? "font-semibold text-ink" : "text-ink-soft"
                  }`}
                  style={{ left: mark.left, maxWidth: mark.width }}
                >
                  {mark.text}
                </span>
              ))}
            </div>
          </div>
          {level === "quran" ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 bottom-1.5 flex justify-between text-xs leading-4 text-ink-soft">
              <span>Al-Fatihah</span>
              <span>An-Nas</span>
            </div>
          ) : null}
        </div>

        {hoverUnit ? (
          <div
            role="tooltip"
            data-testid="completion-tooltip"
            className="pointer-events-none absolute bottom-full z-20 mb-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs leading-5 text-ink shadow-lg"
            style={{ left: hoverLeft, width: tooltipWidth }}
          >
            {hoverLabel}
          </div>
        ) : null}

        {openUnit && details ? (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={popoverTitleId}
            data-testid="completion-popover"
            className={`absolute z-30 rounded-2xl border border-line bg-surface p-3 text-ink shadow-xl ${explorer ? "top-full mt-2" : "bottom-full mb-2"}`}
            style={{ left: popoverLeft, width: popoverWidth }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closePopover(true);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 pt-1">
                <p id={popoverTitleId} className="text-sm font-semibold leading-5">
                  {details.title}
                </p>
                <p className="mt-0.5 text-sm leading-5 text-ink-soft" data-testid="completion-popover-surah">
                  {details.surahLine}
                  {details.finished ? " · Finished" : ""}
                </p>
                {details.detail ? <p className="text-xs leading-5 text-ink-soft">{details.detail}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => closePopover(true)}
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-highlight"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                aria-label={`Previous ${level === "quran" ? "slice" : level}`}
                disabled={openUnit.index === 0}
                onClick={() => stepPopover(-1)}
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-ink disabled:opacity-40"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-primary
                onClick={() => onOpen(details.target)}
                className="inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
              >
                {details.action}
              </button>
              <button
                type="button"
                aria-label={`Next ${level === "quran" ? "slice" : level}`}
                disabled={openUnit.index >= unitCount(level) - 1}
                onClick={() => stepPopover(1)}
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-ink disabled:opacity-40"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-ink-soft">
        <p id={statusId} data-testid="completion-status">
          {LEVEL_NAMES[level]}
          {rangeText ? ` · ${rangeText}` : ""}
        </p>
        <p aria-live="polite" className="sr-only">
          {ready ? `${LEVEL_NAMES[level]} view` : ""}
        </p>
        <p>{hint}</p>
      </div>
    </div>
  );
}

