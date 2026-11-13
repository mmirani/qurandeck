"use client";

import { useEffect, useState } from "react";

const KEY = "qurandeck-reader-hint";

export function ReaderHint() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let show = false;
    try {
      show = localStorage.getItem(KEY) !== "1";
    } catch {
      show = false;
    }
    if (!show) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!open) return null;

  return (
    <aside className="qd-pad mb-4 rounded-3xl border border-gold/30 bg-highlight/80 text-sm leading-6 text-ink">
      <p className="font-display text-base font-semibold text-ink">A quiet start</p>
      <ul className="mt-2 space-y-1 text-ink-soft">
        <li>Search is the top box: a word, a surah, or 2:255.</li>
        <li>Tap an ayah to play it, note it, or highlight it.</li>
        <li>Sana answers plain questions. A full tour lives there if you want one.</li>
      </ul>
      <button
        type="button"
        className="mt-3 inline-flex h-10 items-center rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            // The hint can still close for this visit.
          }
          setOpen(false);
        }}
      >
        Got it
      </button>
    </aside>
  );
}
