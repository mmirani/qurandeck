"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import {
  NUR_SRC,
  companionFilterFromDocument,
  companionFilterFromGold,
} from "@/lib/companion";
import { LUMEN_CANVAS, LUMEN_GOLD } from "@/lib/appearance";

function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

const LUMEN_FILTER = companionFilterFromGold(LUMEN_GOLD, LUMEN_CANVAS);

export function NurVisual({ className = "", lumen = false }: { className?: string; lumen?: boolean }) {
  const reduce = useReducedMotion();
  const live = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");
  const filter = lumen ? LUMEN_FILTER : live;

  return (
    <div className={`nur-stage ${className}`} aria-hidden="true">
      <span className="nur-halo" />
      <span className="nur-floor" />
      <span className={`nur-orb ${reduce ? "" : "is-alive"}`}>
        <Image src={NUR_SRC} alt="" width={140} height={140} draggable={false} className="nur-face" style={{ filter }} />
        <span className="nur-gloss" />
      </span>
    </div>
  );
}
