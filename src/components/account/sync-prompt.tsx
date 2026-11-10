"use client";

import { useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";

export function SyncPrompt() {
  const { user, notes, bookmarks, highlights, openModal } = useMushaf();
  const [hidden, setHidden] = useState(false);
  const saved = notes.length + bookmarks.length + highlights.length;
  if (user || hidden || saved === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 bg-highlight px-3 py-2 text-sm">
      <p className="min-w-0 text-ink">
        Sync your notes across devices
        <span className="text-ink-soft"> — reading stays on this device until you sign in.</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => openModal("auth")}
          className="h-9 cursor-pointer rounded-full bg-gold px-3 text-xs font-semibold text-on-gold"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="h-9 cursor-pointer rounded-full px-2 text-xs text-ink-soft"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
