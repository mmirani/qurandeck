"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { COMPANION_NAME } from "@/lib/brand";
import { BottomSheet } from "@/components/shell/bottom-sheet";
import { SanaGuidePanel } from "@/components/guide/sana-guide-panel";
import { useGuide } from "@/components/guide/guide-provider";
import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  NUR_SIZE,
  NUR_SRC,
  clampPose,
  companionFilterFromDocument,
  defaultCorner,
  defaultPose,
  loadCompanionPose,
  saveCompanionPose,
  type CompanionPose,
} from "@/lib/companion";

const POSE_EVENT = "nur-pose";
const companionAlt = `${COMPANION_NAME} floating companion`;

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

export function SanaCompanion({
  mobileDock = false,
  audioPlaying = false,
}: {
  mobileDock?: boolean;
  audioPlaying?: boolean;
}) {
  if (mobileDock) return <SanaMobileDock audioPlaying={audioPlaying} />;
  return <SanaFloatingCompanion />;
}

function SanaMobileDock({ audioPlaying }: { audioPlaying: boolean }) {
  const { selectedVerseKey } = useMushaf();
  const [mobileOpen, setMobileOpen] = useState(false);
  const filter = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");

  return (
    <>
      <button
        type="button"
        className={`sana-mobile-pill fixed right-4 z-40 inline-flex h-12 min-h-11 cursor-pointer items-center gap-2 rounded-full border border-gold/35 bg-surface/95 px-3 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur-md md:hidden ${
          audioPlaying ? "bottom-[4.75rem]" : "bottom-4"
        }`}
        style={{ touchAction: "manipulation" }}
        aria-label={`Open ${COMPANION_NAME}`}
        onClick={() => setMobileOpen(true)}
      >
        <Image
          src={NUR_SRC}
          alt={companionAlt}
          width={32}
          height={32}
          className="nur-face h-8 w-8 object-contain"
          style={{ filter }}
        />
        <span className="text-sm font-semibold text-ink">{COMPANION_NAME}</span>
      </button>
      <BottomSheet open={mobileOpen} onClose={() => setMobileOpen(false)} title={COMPANION_NAME}>
        {selectedVerseKey ? (
          <p className="border-b border-line/60 px-4 pb-3 text-sm text-ink-soft">Near ayah {selectedVerseKey}</p>
        ) : null}
        <SanaGuidePanel onClose={() => setMobileOpen(false)} onRest={() => setMobileOpen(false)} />
      </BottomSheet>
    </>
  );
}

function SanaFloatingCompanion() {
  const reduce = useReducedMotion();
  const { active: guiding } = useGuide();
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const pose = useSyncExternalStore(subscribePose, loadCompanionPose, () => defaultPose);
  const filter = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const setPose = useCallback((next: CompanionPose) => {
    writePose(next);
  }, []);

  useEffect(() => {
    if (guiding) setOpen(false);
  }, [guiding]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node;
      if (rootRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        <Image src={NUR_SRC} alt={companionAlt} width={36} height={32} className="nur-face" style={{ filter }} />
        Call {COMPANION_NAME}
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`nur ${dragging ? "is-dragging" : ""} ${open ? "is-open" : ""}`}
      style={{ left: place.left, top: place.top, width: NUR_SIZE, height: NUR_SIZE }}
    >
      {open ? (
        <div role="dialog" aria-labelledby="sana-title" className={`nur-panel ${panelLeft ? "is-left" : "is-right"}`}>
          <SanaGuidePanel
            onClose={() => setOpen(false)}
            onRest={() => {
              setOpen(false);
              setPose({ ...pose, hidden: true });
            }}
          />
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
