"use client";

import { useState, useSyncExternalStore } from "react";
import { announce } from "@/lib/reading";
import {
  shareOrDownloadKeepsake,
  keepsakeCardFromReading,
  renderKeepsakePng,
  downloadBlob,
  keepsakeFilename,
} from "@/lib/keepsake-card";
import type { FinishedReading } from "@/lib/finished-reading";

type Variant = "primary" | "secondary" | "quiet";

const STYLES: Record<Variant, string> = {
  primary:
    "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-on-gold disabled:opacity-60",
  secondary:
    "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink disabled:opacity-60",
  quiet:
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink disabled:opacity-60",
};

export function SaveCardButton({
  reading,
  label = "Save a card",
  variant = "secondary",
  share = false,
  className = "",
}: {
  reading: FinishedReading;
  label?: string;
  variant?: Variant;
  share?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const input = keepsakeCardFromReading(reading);

  return (
    <button
      type="button"
      className={`${STYLES[variant]} ${className}`.trim()}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (share) {
            const result = await shareOrDownloadKeepsake(input);
            if (result === "shared") announce("Card ready to send");
            else if (result === "downloaded") announce("Card saved");
          } else {
            const blob = await renderKeepsakePng(input);
            downloadBlob(blob, keepsakeFilename(input.finishedOn));
            announce("Card saved");
          }
        } catch {
          announce("The card could not be saved.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Preparing…" : label}
    </button>
  );
}

export function canOfferShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function subscribeShare() {
  return () => {};
}

export function useCanShare() {
  return useSyncExternalStore(subscribeShare, canOfferShare, () => false);
}
