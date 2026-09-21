"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { COMPANION_NAME, COMPANION_NAME_AR } from "@/lib/brand";
import {
  NUR_SIZE,
  NUR_SRC,
  clampPose,
  companionFilterFromGold,
  defaultCorner,
  defaultPose,
  loadCompanionPose,
  saveCompanionPose,
  type CompanionPose,
} from "@/lib/companion";

const POSE_EVENT = "nur-pose";

function subscribeNever() {
  return () => {};
}

function subscribePose(onChange: () => void) {
  const current = loadCompanionPose();
  if (current.left == null || current.top == null) {
    saveCompanionPose({ ...defaultCorner(), hidden: current.hidden });
  }
  window.addEventListener(POSE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener(POSE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function writePose(next: CompanionPose) {
  saveCompanionPose(next);
  window.dispatchEvent(new Event(POSE_EVENT));
}

function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

function readFilter() {
  const styles = getComputedStyle(document.documentElement);
  return companionFilterFromGold(styles.getPropertyValue("--gold"), styles.getPropertyValue("--canvas"));
}

export function NurCompanion() {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const pose = useSyncExternalStore(subscribePose, loadCompanionPose, () => defaultPose);
  const filter = useSyncExternalStore(subscribeTheme, readFilter, () => "none");
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const setPose = useCallback((next: CompanionPose) => {
    writePose(next);
  }, []);

  if (!mounted) return null;

  const place =
    pose.left == null || pose.top == null ? defaultCorner() : clampPose(pose.left, pose.top);
  const panelLeft = place.left > window.innerWidth / 2;

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, left: place.left, top: place.top };
    setDragging(true);
  };

  const onMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 6) moved.current = true;
    if (!moved.current) return;
    setOpen(false);
    const next = clampPose(drag.current.left + dx, drag.current.top + dy);
    setPose({ ...loadCompanionPose(), ...next, hidden: false });
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const nudge = (dx: number, dy: number) => {
    setPose({ ...pose, ...clampPose(place.left + dx, place.top + dy) });
  };

  if (pose.hidden) {
    return (
      <button
        type="button"
        className="nur-call"
        onClick={() => {
          setPose({ ...defaultCorner(), hidden: false });
          setOpen(true);
        }}
      >
        <Image src={NUR_SRC} alt="" width={36} height={32} className="nur-face" style={{ filter }} />
        Call {COMPANION_NAME}
      </button>
    );
  }

  return (
    <div
      className={`nur ${dragging ? "is-dragging" : ""} ${open ? "is-open" : ""}`}
      style={{ left: place.left, top: place.top, width: NUR_SIZE, height: NUR_SIZE }}
    >
      {open ? (
        <div role="dialog" aria-labelledby="nur-title" className={`nur-panel ${panelLeft ? "is-left" : "is-right"}`}>
          <p id="nur-title" className="nur-name">
            {COMPANION_NAME} <span lang="ar">{COMPANION_NAME_AR}</span>
          </p>
          <p className="nur-copy">
            A little light for your reading. I take the colour of your theme. Drag me anywhere — or use the arrows.
          </p>
          <div className="nur-actions">
            <button type="button" onClick={() => setPose({ ...defaultCorner(), hidden: false })}>
              Come to the corner
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPose({ ...pose, hidden: true });
              }}
            >
              Rest
            </button>
          </div>
        </div>
      ) : null}

      <span className="nur-halo" aria-hidden="true" />
      <span className="nur-floor" aria-hidden="true" />
      <button
        type="button"
        className={`nur-orb ${reduce ? "" : "is-alive"}`}
        aria-label={`${COMPANION_NAME}, reading companion. Drag to move, click to talk.`}
        aria-expanded={open}
        onPointerDown={startDrag}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (moved.current) return;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-16, 0);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(16, 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            nudge(0, -16);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            nudge(0, 16);
          }
        }}
      >
        <Image
          src={NUR_SRC}
          alt=""
          width={NUR_SIZE}
          height={NUR_SIZE}
          draggable={false}
          className="nur-face"
          style={{ filter }}
        />
        <span className="nur-gloss" aria-hidden="true" />
      </button>
    </div>
  );
}
