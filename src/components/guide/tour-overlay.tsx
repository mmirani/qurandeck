"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NurVisual } from "@/components/companion/nur-visual";
import { useGuide } from "@/components/guide/guide-provider";
import { COMPANION_NAME } from "@/lib/brand";

type Hole = { left: number; top: number; width: number; height: number };

function visibleTarget(id?: string) {
  if (!id) return null;
  const nodes = [...document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)];
  return (
    nodes.find((node) => {
      const box = node.getBoundingClientRect();
      return box.width > 8 && box.height > 8;
    }) ?? null
  );
}

function measure(id?: string): Hole | null {
  const node = visibleTarget(id);
  if (!node) return null;
  const box = node.getBoundingClientRect();
  const pad = 10;
  return {
    left: Math.max(8, box.left - pad),
    top: Math.max(8, box.top - pad),
    width: Math.min(window.innerWidth - 16, box.width + pad * 2),
    height: Math.min(window.innerHeight - 16, box.height + pad * 2),
  };
}

function shadePanes(hole: Hole | null) {
  if (!hole) return [{ left: 0, top: 0, right: 0, bottom: 0 }];
  return [
    { left: 0, top: 0, width: "100%", height: hole.top },
    { left: 0, top: hole.top, width: hole.left, height: hole.height },
    { left: hole.left + hole.width, top: hole.top, right: 0, height: hole.height },
    { left: 0, top: hole.top + hole.height, right: 0, bottom: 0 },
  ];
}

export function TourOverlay() {
  const { active, step, steps, index, next, back, skip } = useGuide();
  const reduce = useReducedMotion();
  const [hole, setHole] = useState<Hole | null>(null);

  useEffect(() => {
    if (!active || !step) {
      setHole(null);
      return;
    }
    const node = visibleTarget(step.target);
    node?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const sync = () => setHole(measure(step.target));
    const delay = window.setTimeout(sync, reduce ? 0 : 220);
    const timer = window.setInterval(sync, 250);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(timer);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [active, reduce, step]);

  return (
    <AnimatePresence>
      {active && step ? (
        <motion.div
          className="tour-root"
          data-theme="manuscript"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {shadePanes(hole).map((pane, i) => (
            <button
              key={i}
              type="button"
              className="tour-shade"
              style={pane}
              aria-label="Skip walkthrough"
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
            role="dialog"
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            className="tour-card"
            style={cardPlacement(hole)}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="tour-card-head">
              <NurVisual className="is-sm" lumen />
              <p className="kufic-label text-gold-deep">{COMPANION_NAME}</p>
            </div>
            <h2 id="tour-title" className="tour-title">
              {step.title}
            </h2>
            <p id="tour-body" className="tour-body">
              {step.body}
            </p>
            <div className="tour-nav">
              <button type="button" className="tour-ghost" onClick={skip}>
                Skip
              </button>
              <div className="tour-nav-end">
                {index > 0 ? (
                  <button type="button" className="tour-ghost" onClick={back}>
                    Back
                  </button>
                ) : null}
                <button type="button" className="tour-next" onClick={next}>
                  {index >= steps.length - 1 ? "Done" : "Next"}
                </button>
              </div>
            </div>
            {steps.length > 1 ? (
              <p className="tour-count">
                {index + 1} of {steps.length}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function cardPlacement(hole: Hole | null): React.CSSProperties {
  const width = Math.min(340, typeof window === "undefined" ? 340 : window.innerWidth - 24);
  if (!hole || typeof window === "undefined") {
    return { left: "50%", top: "18%", width, transform: "translateX(-50%)" };
  }
  const below = hole.top + hole.height + 16;
  const left = Math.min(Math.max(12, hole.left), window.innerWidth - width - 12);
  if (below + 240 < window.innerHeight) return { left, top: below, width };
  if (hole.top > 240) return { left, top: Math.max(12, hole.top - 220), width };
  return { left: "50%", top: "14%", width, transform: "translateX(-50%)" };
}
