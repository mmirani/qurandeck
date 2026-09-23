"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MIN_SCALE = 0.72;

export function useAyahFitScale(verseKey: string) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const fit = () => {
      const maxH = viewport.clientHeight;
      if (maxH <= 0) return;

      const apply = (scale: number) => {
        viewport.style.setProperty("--ayah-fit", String(scale));
      };

      apply(1);
      if (content.scrollHeight <= maxH) {
        setScrollable(false);
        viewport.dataset.fit = "true";
        return;
      }

      let low = MIN_SCALE;
      let high = 1;
      let best = MIN_SCALE;

      for (let i = 0; i < 14; i++) {
        const mid = (low + high) / 2;
        apply(mid);
        if (content.scrollHeight <= maxH) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      apply(best);
      const needsScroll = content.scrollHeight > maxH;
      setScrollable(needsScroll);
      viewport.dataset.fit = needsScroll ? "false" : "true";
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(viewport);
    ro.observe(content);
    return () => ro.disconnect();
  }, [verseKey]);

  return { viewportRef, contentRef, scrollable };
}
