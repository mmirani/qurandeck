"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { COMPANION_NAME } from "@/lib/brand";
import { SanaGuidePanel } from "@/components/guide/sana-guide-panel";
import { useGuide } from "@/components/guide/guide-provider";
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

function subscribePose(onChange: () => void) {
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
  audioBarVisible = false,
  ayahMode = false,
}: {
  audioBarVisible?: boolean;
  ayahMode?: boolean;
}) {
  return (
    <>
      <div className="xl:hidden">
        <SanaDock audioBarVisible={audioBarVisible} ayahMode={ayahMode} />
      </div>
      <div className="hidden xl:contents">
        <SanaFloatingCompanion />
      </div>
    </>
  );
}

function SanaDock({ audioBarVisible, ayahMode }: { audioBarVisible: boolean; ayahMode: boolean }) {
  const [open, setOpen] = useState(false);
  const filter = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`sana-dock ${ayahMode ? "is-ayah" : ""} ${audioBarVisible ? "is-audio" : ""}`}
        aria-label={`Open ${COMPANION_NAME}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Image
          src={NUR_SRC}
          alt=""
          width={28}
          height={28}
          className="nur-face h-7 w-7 shrink-0 object-contain"
          style={{ filter }}
        />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 cursor-pointer bg-black/45" aria-label={`Close ${COMPANION_NAME}`} onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sana-title"
            className="sana-sheet absolute inset-x-0 bottom-0 flex max-h-[min(85dvh,40rem)] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface shadow-[0_-20px_50px_rgba(15,23,42,0.18)]"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3">
              <SanaGuidePanel onClose={close} onRest={close} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SanaFloatingCompanion() {
  const { active: guiding } = useGuide();
  const pose = useSyncExternalStore(subscribePose, loadCompanionPose, () => defaultPose);
  const filter = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const setPose = useCallback((next: CompanionPose) => {
    writePose(next);
  }, []);

  if (guiding && open) setOpen(false);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => orbRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node;
      if (rootRef.current?.contains(node)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [close, open]);

  const placed = pose.left != null && pose.top != null;
  const place = placed ? clampPose(pose.left ?? 0, pose.top ?? 0) : null;
  const panelOnLeft = place ? place.left > window.innerWidth / 2 : true;

  const origin = () => {
    const box = rootRef.current?.getBoundingClientRect();
    if (box) return { left: box.left, top: box.top };
    return defaultCorner();
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = place ?? origin();
    drag.current = { x: event.clientX, y: event.clientY, left: start.left, top: start.top };
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
    const start = place ?? origin();
    setPose({ ...pose, ...clampPose(start.left + dx, start.top + dy), hidden: false });
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
      ref={rootRef}
      className={`nur ${dragging ? "is-dragging" : ""} ${open ? "is-open" : ""} ${placed ? "is-placed" : ""}`}
      style={place ? { left: place.left, top: place.top, width: NUR_SIZE, height: NUR_SIZE } : { width: NUR_SIZE, height: NUR_SIZE }}
    >
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sana-title"
          className={`nur-panel ${panelOnLeft ? "is-left" : "is-right"}`}
        >
          <SanaGuidePanel onClose={close} onRest={() => {
            close();
            setPose({ ...pose, hidden: true });
          }} />
        </div>
      ) : null}

      <span className="nur-halo" aria-hidden="true" />
      <span className="nur-floor" aria-hidden="true" />
      <button
        ref={orbRef}
        type="button"
        className="nur-orb"
        aria-label={`${COMPANION_NAME}, reading companion. Drag to move, click to talk.`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={startDrag}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (moved.current) return;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 48 : 16;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-step, 0);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(step, 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            nudge(0, -step);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            nudge(0, step);
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
