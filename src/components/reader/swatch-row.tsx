"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Eraser, Highlighter, X } from "lucide-react";
import type { HighlightSwatch } from "@/lib/quran/types";

export type AnchorBox = { left: number; top: number; width: number; height: number };

export function anchorBox(el: HTMLElement): AnchorBox {
  const rect = el.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function moveFocus(buttons: HTMLButtonElement[], delta: number) {
  if (buttons.length === 0) return;
  const index = buttons.findIndex((button) => button === document.activeElement);
  const next = index < 0 ? 0 : (index + delta + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

export function SwatchRow({
  swatches,
  activeId,
  onPick,
  onErase,
  eraseLabel = "Remove",
  onClose,
  label = "Highlight colours",
  autoFocus = false,
}: {
  swatches: HighlightSwatch[];
  activeId: string;
  onPick: (swatchId: string) => void;
  onErase?: () => void;
  eraseLabel?: string;
  onClose: () => void;
  label?: string;
  autoFocus?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!autoFocus) return;
    const root = listRef.current;
    if (!root) return;
    const current =
      root.querySelector<HTMLButtonElement>("[aria-pressed='true']") ??
      root.querySelector<HTMLButtonElement>("[data-swatch]");
    current?.focus();
  }, [autoFocus]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-swatch]") ?? [])];
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(buttons, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(buttons, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  };

  return (
    <div ref={listRef} role="group" aria-label={label} className="flex flex-wrap items-center gap-1" onKeyDown={onKeyDown}>
      {swatches.map((pen) => {
        const pressed = pen.id === activeId;
        return (
          <button
            key={pen.id}
            type="button"
            data-swatch=""
            aria-label={pen.name}
            aria-pressed={pressed}
            onClick={() => onPick(pen.id)}
            className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full ${
              pressed ? "ring-2 ring-gold-deep ring-offset-2 ring-offset-surface" : ""
            }`}
          >
            <span aria-hidden="true" className="h-6 w-6 rounded-full border border-line" style={{ background: pen.color }} />
          </button>
        );
      })}
      {onErase ? (
        <button
          type="button"
          data-swatch=""
          aria-label={eraseLabel}
          onClick={onErase}
          className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm text-danger"
        >
          <Eraser className="h-4 w-4" />
          {eraseLabel}
        </button>
      ) : null}
    </div>
  );
}

function placePopover(anchor: AnchorBox) {
  const width = 360;
  const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - 8);
  const below = anchor.top + anchor.height + 8;
  const top = anchor.height > 0 && below < window.innerHeight - 64 ? below : Math.max(8, anchor.top - 72);
  return { left, top };
}

export function HighlightPopover({
  anchor,
  swatches,
  activeId,
  onPick,
  onErase,
  eraseLabel = "Remove",
  onAyah,
  onMark,
  onClose,
  preserveSelection = false,
  showClose = false,
  returnFocus = null,
  menuId,
}: {
  anchor: AnchorBox;
  swatches: HighlightSwatch[];
  activeId: string;
  onPick: (swatchId: string) => void;
  onErase?: () => void;
  eraseLabel?: string;
  onAyah?: () => void;
  onMark?: () => void;
  onClose: () => void;
  preserveSelection?: boolean;
  showClose?: boolean;
  returnFocus?: HTMLElement | null;
  menuId?: string;
}) {
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const focusBack = useRef<HTMLElement | null>(returnFocus ?? null);
  const onCloseRef = useRef(onClose);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusBack.current = returnFocus ?? null;
    onCloseRef.current = onClose;
  }, [onClose, returnFocus]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-highlight-trigger]")) return;
      onCloseRef.current();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    return () => focusBack.current?.focus();
  }, []);

  if (!ready) return null;
  const pos = placePopover(anchor);

  return createPortal(
    <div
      ref={rootRef}
      id={menuId}
      role="dialog"
      aria-label="Highlight colours"
      className="fixed z-50 flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1 rounded-3xl border border-line bg-surface p-2 shadow-[var(--shadow)]"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(event) => {
        if (preserveSelection) event.preventDefault();
      }}
    >
      <SwatchRow
        swatches={swatches}
        activeId={activeId}
        onPick={onPick}
        onErase={onErase}
        eraseLabel={eraseLabel}
        onClose={onClose}
        autoFocus
      />
      {onMark ? (
        <button
          type="button"
          onClick={onMark}
          className="inline-flex h-11 min-w-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm text-ink"
        >
          <Highlighter className="h-4 w-4" />
          Mark
        </button>
      ) : null}
      {onAyah ? (
        <button type="button" onClick={onAyah} className="inline-flex h-11 cursor-pointer items-center rounded-full px-3 text-sm text-gold-deep">
          Whole ayah
        </button>
      ) : null}
      {showClose ? (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
