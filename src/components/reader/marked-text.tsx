"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eraser, Highlighter, X } from "lucide-react";
import { swatchById } from "@/lib/highlights";
import type { Highlight, HighlightSwatch } from "@/lib/quran/types";
import { markPlainText, selectionOffsets } from "@/lib/highlights";

export function MarkedText({
  text,
  marks,
  swatches,
  className,
  onSelect,
  onRemove,
}: {
  text: string;
  marks: Highlight[];
  swatches: HighlightSwatch[];
  className?: string;
  onSelect: (start: number, end: number, snippet: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
}) {
  const root = useRef<HTMLParagraphElement>(null);
  const spans = markPlainText(text, marks);

  return (
    <p
      ref={root}
      className={className}
      onMouseUp={(event) => {
        if (!root.current) return;
        const picked = selectionOffsets(root.current);
        if (!picked) return;
        event.stopPropagation();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const box = selection.getRangeAt(0).getBoundingClientRect();
        onSelect(picked.start, picked.end, picked.text, box.left + box.width / 2, box.top);
      }}
    >
      {spans.map((span, index) => {
        if (!span.highlight) return <span key={index}>{span.text}</span>;
        const pen = swatchById(swatches, span.highlight.swatchId);
        return (
          <mark
            key={index}
            className="ayah-mark cursor-pointer"
            style={{ ["--mark-color" as string]: pen.color }}
            title={`${pen.name} · click to remove`}
            onClick={(event) => {
              if (!onRemove) return;
              event.stopPropagation();
              onRemove(span.highlight!.id);
            }}
          >
            {span.text}
          </mark>
        );
      })}
    </p>
  );
}

export function HighlightPopover({
  x,
  y,
  swatches,
  activeId,
  onPick,
  onAyah,
  onErase,
  onClose,
}: {
  x: number;
  y: number;
  swatches: HighlightSwatch[];
  activeId: string;
  onPick: (swatchId: string) => void;
  onAyah?: () => void;
  onErase?: () => void;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  const left = Math.min(Math.max(12, x - 140), window.innerWidth - 292);
  const top = Math.max(12, y - 72);

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-1 rounded-full border border-gold/40 bg-surface px-2 py-1 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      style={{ left, top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {swatches.map((pen) => (
        <button
          key={pen.id}
          type="button"
          title={pen.name}
          aria-label={`Highlight with ${pen.name}`}
          onClick={() => onPick(pen.id)}
          className={`h-8 w-8 cursor-pointer rounded-full border ${
            pen.id === activeId ? "ring-2 ring-gold-deep" : "border-black/10"
          }`}
          style={{ background: pen.color }}
        />
      ))}
      <button
        type="button"
        onClick={() => onPick(activeId)}
        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[11px] text-ink"
      >
        <Highlighter className="h-3.5 w-3.5" />
        Mark
      </button>
      {onAyah ? (
        <button type="button" onClick={onAyah} className="h-8 cursor-pointer rounded-full px-2 text-[11px] text-gold-deep">
          Whole ayah
        </button>
      ) : null}
      {onErase ? (
        <button
          type="button"
          aria-label="Remove highlight"
          onClick={onErase}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-[11px] text-danger"
        >
          <Eraser className="h-3.5 w-3.5" />
          Remove
        </button>
      ) : null}
      <button type="button" aria-label="Close" onClick={onClose} className="h-8 w-8 cursor-pointer rounded-full text-muted">
        <X className="mx-auto h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  );
}
