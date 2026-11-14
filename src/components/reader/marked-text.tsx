"use client";

import { useRef } from "react";
import { swatchById } from "@/lib/highlights";
import type { Highlight, HighlightSwatch } from "@/lib/quran/types";
import { markPlainText, selectionOffsets } from "@/lib/highlights";

export { HighlightPopover } from "@/components/reader/swatch-row";

export function MarkedText({
  text,
  marks,
  swatches,
  className,
  onSelect,
  onRecolor,
}: {
  text: string;
  marks: Highlight[];
  swatches: HighlightSwatch[];
  className?: string;
  onSelect: (start: number, end: number, snippet: string, x: number, y: number) => void;
  onRecolor?: (highlight: Highlight, anchor: HTMLElement) => void;
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
            role={onRecolor ? "button" : undefined}
            tabIndex={onRecolor ? 0 : undefined}
            aria-label={onRecolor ? `${pen.name} highlight. Change colour` : undefined}
            title={`${pen.name}. Change colour`}
            onClick={(event) => {
              if (!onRecolor || !span.highlight) return;
              event.stopPropagation();
              onRecolor(span.highlight, event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (!onRecolor || !span.highlight) return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onRecolor(span.highlight, event.currentTarget);
            }}
          >
            {span.text}
          </mark>
        );
      })}
    </p>
  );
}
