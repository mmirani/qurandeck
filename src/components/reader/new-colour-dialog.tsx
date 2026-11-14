"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SWATCH_NAME_MAX,
  SWATCH_PRESETS,
  normalizeHex,
  swatchNameError,
  washContrast,
} from "@/lib/swatch-palette";
import type { HighlightSwatch } from "@/lib/quran/types";

export function NewColourDialog({
  swatches,
  onSave,
  onClose,
}: {
  swatches: HighlightSwatch[];
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const nameId = useId();
  const hexId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState(SWATCH_PRESETS[0]?.color ?? "#F5D76E");
  const [hex, setHex] = useState(SWATCH_PRESETS[0]?.color ?? "#F5D76E");
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const parsed = normalizeHex(hex) ?? normalizeHex(color);
  const nameError = swatchNameError(swatches, name);
  const contrast = parsed ? washContrast(parsed) : { ratio: 1, passes: false };

  const choose = (next: string) => {
    const hexColor = normalizeHex(next);
    if (!hexColor) return;
    setColor(hexColor);
    setHex(hexColor);
  };

  const save = () => {
    setTried(true);
    if (!parsed || nameError) return;
    onSave(name.trim(), parsed);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" data-colour-dialog="">
      <button type="button" aria-label="Close new colour" className="absolute inset-0 cursor-pointer bg-black/45" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="relative z-10 flex max-h-[min(90dvh,40rem)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow)]"
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          New colour
        </h2>
        <div role="group" aria-label="Preset colours" className="grid grid-cols-5 gap-2">
          {SWATCH_PRESETS.map((preset) => {
            const selected = parsed === preset.color;
            return (
              <button
                key={preset.color}
                type="button"
                aria-label={preset.name}
                aria-pressed={selected}
                title={preset.name}
                onClick={() => choose(preset.color)}
                className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-full ${
                  selected ? "ring-2 ring-gold-deep ring-offset-2 ring-offset-surface" : ""
                }`}
              >
                <span aria-hidden="true" className="h-6 w-6 rounded-full border border-line" style={{ background: preset.color }} />
              </button>
            );
          })}
        </div>
        <div className="flex items-end gap-3">
          <label className="text-sm font-medium text-ink" htmlFor={hexId}>
            Custom colour
            <input
              id={hexId}
              value={hex}
              onChange={(event) => {
                setHex(event.target.value);
                const next = normalizeHex(event.target.value);
                if (next) setColor(next);
              }}
              spellCheck={false}
              autoCapitalize="off"
              className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-3 text-base text-ink"
            />
          </label>
          <input
            type="color"
            aria-label="Pick a custom colour"
            value={parsed ?? "#F5D76E"}
            onChange={(event) => choose(event.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-line bg-transparent"
          />
        </div>
        <label className="text-sm font-medium text-ink" htmlFor={nameId}>
          Name
          <input
            ref={nameRef}
            id={nameId}
            value={name}
            maxLength={SWATCH_NAME_MAX}
            required
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-11 w-full rounded-2xl border border-line bg-canvas px-3 text-base text-ink"
          />
        </label>
        {tried && nameError ? <p className="text-sm text-danger">{nameError}</p> : null}
        <p
          className="rounded-2xl px-3 py-3 text-base leading-6 text-ink"
          style={{ background: `color-mix(in srgb, ${parsed ?? color} 40%, var(--surface))` }}
        >
          In the name of Allah, the Entirely Merciful, the Especially Merciful.
        </p>
        {parsed && !contrast.passes ? (
          <p role="status" className="text-sm text-danger">
            This colour is hard to read on the ayah in light or dark themes. Text contrast is {contrast.ratio.toFixed(1)}:1, below 4.5:1.
          </p>
        ) : null}
        <div className="flex gap-2">
          <button type="submit" className="inline-flex h-11 min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-gold text-sm font-semibold text-on-gold">
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-line text-sm font-medium text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
