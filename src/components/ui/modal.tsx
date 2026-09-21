"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
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
        className={`ornament-border paper-panel relative z-10 max-h-[88vh] w-full overflow-hidden rounded-3xl ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/50 px-6 py-5">
          <div>
            {eyebrow ? <p className="kufic-label text-gold-deep">{eyebrow}</p> : null}
            <h2 id="modal-title" className="mt-1 font-display text-3xl text-ink">
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
        <div className="max-h-[calc(88vh-88px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
