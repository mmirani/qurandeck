"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  stable = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  stable?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-pointer bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`ornament-border paper-panel relative z-10 flex w-full flex-col overflow-hidden rounded-3xl ${
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
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink hover:bg-highlight"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className={`qd-pad overflow-y-auto ${stable ? "min-h-0 flex-1" : "max-h-[calc(88vh-5.5rem)]"}`}>{children}</div>
      </div>
    </div>
  );
}
