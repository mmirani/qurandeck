"use client";

import { useEffect, useState } from "react";

type Toast = { message: string; text?: string };

export function ToastHost() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let timer = 0;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<Toast>).detail;
      if (!detail?.message) return;
      setToast(detail);
      window.clearTimeout(timer);
      if (!detail.text) timer = window.setTimeout(() => setToast(null), 2400);
    };
    window.addEventListener("qurandeck-toast", onToast);
    return () => {
      window.removeEventListener("qurandeck-toast", onToast);
      window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
      >
        <p className="font-medium">{toast.message}</p>
        {toast.text ? (
          <label className="mt-2 block text-xs text-ink-soft">
            Select and copy
            <textarea readOnly value={toast.text} rows={4} className="mt-1 w-full resize-none rounded-xl border border-line bg-canvas p-2 text-sm text-ink" />
          </label>
        ) : null}
        <button type="button" className="mt-2 text-xs font-medium text-gold-deep" onClick={() => setToast(null)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
