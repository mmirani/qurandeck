"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { SwatchRow } from "@/components/reader/swatch-row";
import { dialogFocusables, trapTabIndex } from "@/lib/dialog-focus";
import { swatchNameError } from "@/lib/swatch-palette";

export function ColourManager({ onEscape }: { onEscape?: () => void }) {
  const { highlights, swatches, preferences, updateSwatch, moveSwatch, deleteSwatch, setActiveSwatch } = useMushaf();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [recolorTo, setRecolorTo] = useState("");
  const deleting = swatches.find((item) => item.id === pendingDelete) ?? null;
  const used = deleting ? highlights.filter((item) => item.swatchId === deleting.id).length : 0;
  const others = swatches.filter((item) => item.id !== deleting?.id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-6 text-ink-soft">
        This is the colour row used everywhere you highlight. The order here is the order in that row.
      </p>
      <SwatchRow
        swatches={swatches}
        activeId={preferences.activeSwatchId}
        label="Your highlight colours"
        onPick={setActiveSwatch}
        onClose={() => onEscape?.()}
      />
      <ul className="flex flex-col gap-2">
        {swatches.map((pen, index) => (
          <li key={pen.id} className="qd-pad-sm flex flex-wrap items-center gap-2 rounded-2xl border border-line">
            <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-line" style={{ background: pen.color }} />
            <input
              key={`${pen.id}-${pen.name}`}
              defaultValue={pen.name}
              maxLength={24}
              aria-label={`Rename ${pen.name}`}
              onBlur={(event) => {
                const error = swatchNameError(swatches, event.target.value, pen.id);
                if (error || event.target.value.trim() === pen.name) {
                  event.target.value = pen.name;
                  return;
                }
                updateSwatch(pen.id, { name: event.target.value });
              }}
              className="h-11 min-w-40 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm text-ink"
            />
            <input
              type="color"
              value={pen.color}
              aria-label={`${pen.name} colour`}
              onChange={(event) => updateSwatch(pen.id, { color: event.target.value })}
              className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-transparent"
            />
            <button
              type="button"
              aria-label={`Move ${pen.name} earlier`}
              disabled={index === 0}
              onClick={() => moveSwatch(pen.id, -1)}
              className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move ${pen.name} later`}
              disabled={index === swatches.length - 1}
              onClick={() => moveSwatch(pen.id, 1)}
              className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Down
            </button>
            <button
              type="button"
              onClick={() => {
                const count = highlights.filter((item) => item.swatchId === pen.id).length;
                if (count === 0) {
                  deleteSwatch(pen.id, { kind: "remove" });
                  return;
                }
                setRecolorTo(swatches.find((item) => item.id !== pen.id)?.id ?? "");
                setPendingDelete(pen.id);
              }}
              className="inline-flex h-11 min-h-11 cursor-pointer items-center rounded-full px-3 text-sm text-danger"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {deleting && used > 0 ? (
        <div
          role="dialog"
          aria-labelledby="delete-colour-title"
          data-colour-delete=""
          className="rounded-2xl border border-line bg-canvas p-4"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setPendingDelete(null);
          }}
        >
          <h3 id="delete-colour-title" className="text-sm font-semibold text-ink">
            {deleting.name} is used on {used} highlight{used === 1 ? "" : "s"}
          </h3>
          <p className="mt-2 text-sm text-ink-soft">Recolour those highlights, or remove them.</p>
          {others.length > 0 ? (
            <label className="mt-3 block text-sm text-ink">
              Recolour to
              <select
                value={recolorTo}
                onChange={(event) => setRecolorTo(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
              >
                {others.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {others.length > 0 ? (
              <button
                type="button"
                disabled={!recolorTo}
                onClick={() => {
                  deleteSwatch(deleting.id, { kind: "recolor", toId: recolorTo });
                  setPendingDelete(null);
                }}
                className="inline-flex h-11 cursor-pointer items-center rounded-full bg-gold px-4 text-sm font-semibold text-on-gold disabled:opacity-40"
              >
                Recolour
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                deleteSwatch(deleting.id, { kind: "remove" });
                setPendingDelete(null);
              }}
              className="inline-flex h-11 cursor-pointer items-center rounded-full border border-danger/40 px-4 text-sm text-danger"
            >
              Remove highlights
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-sm text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ColourManagerSheet({
  open,
  onClose,
  backLabel,
}: {
  open: boolean;
  onClose: () => void;
  backLabel: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = panelRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-colour-dialog], [data-colour-delete]")) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = dialogFocusables(root);
      if (items.length === 0) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const current = active ? items.indexOf(active) : -1;
      const leaving = current < 0 || (event.shiftKey ? current === 0 : current === items.length - 1);
      if (!leaving) return;
      event.preventDefault();
      items[trapTabIndex(current, items.length, event.shiftKey)]?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    const frame = window.requestAnimationFrame(() => backRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-pointer bg-black/45" aria-label={backLabel} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ornament-border paper-panel relative z-10 flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl"
      >
        <div className="qd-pad flex shrink-0 items-center justify-between gap-3 border-b border-line/50">
          <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
            Highlight colours
          </h2>
          <button
            ref={backRef}
            type="button"
            aria-label={backLabel}
            onClick={onClose}
            className="inline-flex h-11 min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink"
          >
            Back
          </button>
        </div>
        <div className="qd-pad overflow-y-auto">
          <ColourManager onEscape={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
