"use client";

import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 md:hidden ${className}`} role="presentation">
      <button type="button" aria-label="Close sheet" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 left-0 right-0 flex max-h-[min(85dvh,640px)] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface shadow-[0_-20px_50px_rgba(15,23,42,0.18)]"
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-line/60 px-4 pb-3 pt-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            {title ? <p className="font-display text-base font-semibold text-ink">{title}</p> : <span />}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-highlight"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
