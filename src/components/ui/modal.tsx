"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { dialogFocusables, initialDialogIndex, trapTabIndex } from "@/lib/dialog-focus";

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  stable = false,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  stable?: boolean;
  actions?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const root = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
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
    };
    document.addEventListener("keydown", onKey);
    const items = root ? dialogFocusables(root) : [];
    const closeIndex = items.findIndex((item) => item.hasAttribute("data-dialog-close"));
    const initial = initialDialogIndex(items.length, closeIndex);
    if (initial >= 0) items[initial]?.focus();
    else root?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-pointer bg-black/45"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`ornament-border paper-panel relative z-10 flex w-full flex-col overflow-hidden rounded-3xl outline-none ${
          stable ? "h-[min(88vh,44rem)]" : "max-h-[88vh]"
        } ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        <div className="qd-pad flex shrink-0 items-start justify-between gap-4 border-b border-line/50">
          <div className="qd-cluster min-w-0">
            {eyebrow ? <p className="kufic-label text-gold-deep">{eyebrow}</p> : null}
            <h2 id="modal-title" className="font-display text-3xl leading-tight text-ink">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          <button
            type="button"
            data-dialog-close
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-11 min-h-11 w-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          </div>
        </div>
        <div className={`qd-pad overflow-y-auto ${stable ? "min-h-0 flex-1" : "max-h-[calc(88vh-5.5rem)]"}`}>{children}</div>
      </div>
    </div>
  );
}
