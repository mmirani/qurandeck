"use client";

import { useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";

export function SyncPrompt() {
  const { user, notes, bookmarks, highlights, openModal } = useMushaf();
  const [hidden, setHidden] = useState(false);
  const saved = notes.length + bookmarks.length + highlights.length;
  if (user || hidden || saved === 0) return null;

  return (
    <div className="qd-gutter flex items-center justify-between gap-3 border-b border-line/70 bg-highlight py-3 text-sm">
      <p className="min-w-0 text-ink">
        Sync your notes across devices
        <span className="text-ink-soft"> — reading stays on this device until you sign in.</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => openModal("auth")}
          className="h-11 min-h-11 cursor-pointer rounded-full bg-gold px-4 text-xs font-semibold text-on-gold"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="h-11 min-h-11 cursor-pointer rounded-full px-3 text-xs text-ink-soft"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
