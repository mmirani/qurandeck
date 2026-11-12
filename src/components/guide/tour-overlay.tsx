"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SanaVisual } from "@/components/companion/sana-visual";
import { useGuide } from "@/components/guide/guide-provider";
import { COMPANION_NAME } from "@/lib/brand";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  TOUR_NARROW_MAX,
  clampTourHole,
  placeTourCard,
  presentTourStep,
  tourShadePanes,
  type TourCardBox,
  type TourHole,
  type TourViewport,
} from "@/lib/guide/placement";
import type { TourStep } from "@/lib/guide/catalog";

type Insets = { top: number; right: number; bottom: number; left: number };

const EMPTY_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function isTourVisible(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  if (box.width <= 8 || box.height <= 8) return false;
  let parent: HTMLElement | null = node;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (parent !== node && style.overflow !== "visible") {
      const parentBox = parent.getBoundingClientRect();
      if (parentBox.width <= 8 || parentBox.height <= 8) return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function findTourTarget(id?: string) {
  if (!id || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour~="${CSS.escape(id)}"]`);
  for (const node of nodes) {
    if (isTourVisible(node)) return node;
  }
  return null;
}

function readViewport(insets: Insets): TourViewport {
  const visual = window.visualViewport;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
    offsetLeft: visual?.offsetLeft ?? 0,
    offsetTop: visual?.offsetTop ?? 0,
    safeTop: insets.top,
    safeRight: insets.right,
    safeBottom: insets.bottom,
    safeLeft: insets.left,
  };
}

function useSafeInsets() {
  const [insets, setInsets] = useState<Insets>(EMPTY_INSETS);
  useEffect(() => {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
    const read = () => {
      const style = getComputedStyle(probe);
      setInsets({
        top: Number.parseFloat(style.paddingTop) || 0,
        right: Number.parseFloat(style.paddingRight) || 0,
        bottom: Number.parseFloat(style.paddingBottom) || 0,
        left: Number.parseFloat(style.paddingLeft) || 0,
      });
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
      probe.remove();
    };
  }, []);
  return insets;
}

function focusable(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter(
    (node) => !node.hasAttribute("disabled"),
  );
}

export function TourOverlay() {
  const { active, step, steps, index, next, back, skip } = useGuide();
  const reduce = useReducedMotion();
  const coarsePointer = useMediaQuery("(pointer: coarse), (hover: none)");
  const insets = useSafeInsets();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const heightRef = useRef(240);
  const [cardHeight, setCardHeight] = useState(240);
  const [tick, setTick] = useState(0);
  const scrolledStep = useRef<string | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) scrolledStep.current = null;
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;
    const bump = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setTick((value) => value + 1));
    };
    window.addEventListener("resize", bump);
    window.addEventListener("orientationchange", bump);
    window.addEventListener("scroll", bump, true);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", bump);
    visual?.addEventListener("scroll", bump);
    bump();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", bump);
      window.removeEventListener("orientationchange", bump);
      window.removeEventListener("scroll", bump, true);
      visual?.removeEventListener("resize", bump);
      visual?.removeEventListener("scroll", bump);
    };
  }, [active, step]);

  const viewport = typeof window === "undefined" ? null : readViewport(insets);
  const shown = step && viewport ? shownStep(step, viewport, coarsePointer) : null;
  const hole = shown && viewport ? measureHole(shown.target, viewport) : null;
  const box =
    viewport && shown ? placeTourCard(viewport, hole, cardHeight) : placeTourCard({ width: 1280, height: 800 }, null, cardHeight);

  const shownTarget = shown?.target;
  useEffect(() => {
    if (!active || !shownTarget) return;
    const key = `${index}:${shownTarget}`;
    if (scrolledStep.current === key) return;
    scrolledStep.current = key;
    const node = findTourTarget(shownTarget);
    node?.scrollIntoView({
      block: window.innerWidth <= TOUR_NARROW_MAX ? "start" : "center",
      inline: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    const follow = window.setTimeout(() => setTick((value) => value + 1), reduce ? 0 : 360);
    return () => window.clearTimeout(follow);
  }, [active, index, reduce, shownTarget]);

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const border = node.offsetHeight - node.clientHeight;
    const nextHeight = Math.ceil(node.scrollHeight + Math.max(0, border));
    if (nextHeight > 0 && Math.abs(nextHeight - heightRef.current) > 2) {
      heightRef.current = nextHeight;
      setCardHeight(nextHeight);
    }
  }, [tick, index, shown?.body, box.top, box.left, box.width]);

  useEffect(() => {
    if (!active) return;
    const focus = window.setTimeout(() => nextRef.current?.focus(), reduce ? 0 : 40);
    return () => window.clearTimeout(focus);
  }, [active, index, reduce]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const card = cardRef.current;
      if (!card) return;
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable(card);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, back, next, skip]);

  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <AnimatePresence>
      {active && step && shown ? (
        <motion.div
          className="tour-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {(viewport ? tourShadePanes(hole, viewport) : []).map((pane, paneIndex) => (
            <div
              key={paneIndex}
              className="tour-shade"
              style={pane}
              aria-hidden="true"
              onClick={skip}
            />
          ))}
          {hole ? (
            <motion.div
              className="tour-hole"
              initial={false}
              animate={hole}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
            />
          ) : null}
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-body tour-count"
            data-tour-step={step.id}
            data-placement={box.placement}
            className={`tour-card qd-card${box.placement === "sheet" ? " is-sheet" : ""}`}
            style={cardStyle(box)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                swipe.current = null;
                return;
              }
              swipe.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
              if (dx < 0) next();
              else back();
            }}
          >
            <div className="tour-card-head">
              <SanaVisual className="is-sm" lumen />
              <p className="kufic-label text-gold-deep">{COMPANION_NAME}</p>
            </div>
            <h2 id="tour-title" className="tour-title">
              {shown.title}
            </h2>
            <p id="tour-body" className="tour-body">
              {shown.body}
            </p>
            <div className="tour-nav" role="group" aria-label="Tour controls">
              <button type="button" className="tour-ghost" onClick={skip}>
                Skip
              </button>
              <div className="tour-nav-end">
                {index > 0 ? (
                  <button type="button" className="tour-ghost" onClick={back}>
                    Back
                  </button>
                ) : null}
                <button ref={nextRef} type="button" className="tour-next" onClick={next}>
                  {index >= steps.length - 1 ? "Done" : "Next"}
                </button>
              </div>
            </div>
            <p id="tour-count" className="tour-count">
              {index + 1} of {steps.length}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function shownStep(step: TourStep, viewport: TourViewport, coarsePointer: boolean) {
  return presentTourStep(step, {
    primaryVisible: Boolean(step.target && findTourTarget(step.target)),
    mobileVisible: Boolean(step.mobileTarget && findTourTarget(step.mobileTarget)),
    narrow: viewport.width <= TOUR_NARROW_MAX,
    coarsePointer,
  });
}

function measureHole(target: string | undefined, viewport: TourViewport): TourHole | null {
  const node = findTourTarget(target);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return clampTourHole(
    {
      left: rect.left + (viewport.offsetLeft ?? 0),
      top: rect.top + (viewport.offsetTop ?? 0),
      width: rect.width,
      height: rect.height,
    },
    viewport,
  );
}

function cardStyle(box: TourCardBox): React.CSSProperties {
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    maxHeight: box.height,
  };
}
