"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  NUR_SRC,
  companionFilterFromDocument,
  companionFilterFromGold,
} from "@/lib/companion";
import { COMPANION_NAME } from "@/lib/brand";
import { LUMEN_CANVAS, LUMEN_GOLD } from "@/lib/appearance";

function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

const LUMEN_FILTER = companionFilterFromGold(LUMEN_GOLD, LUMEN_CANVAS);

export function SanaVisual({
  className = "",
  lumen = false,
  demoInteractive = false,
}: {
  className?: string;
  lumen?: boolean;
  /** Landing demo: tap bounce on touch devices; vertical scroll passes through the frame. */
  demoInteractive?: boolean;
}) {
  const reduce = useReducedMotion();
  const live = useSyncExternalStore(subscribeTheme, companionFilterFromDocument, () => "none");
  const filter = lumen ? LUMEN_FILTER : live;
  const alt = `${COMPANION_NAME} floating companion`;
  const [tapped, setTapped] = useState(false);

  const onDemoTap = useCallback(() => {
    if (!demoInteractive || reduce) return;
    setTapped(true);
    window.setTimeout(() => setTapped(false), 560);
  }, [demoInteractive, reduce]);

  const bob = !reduce && !demoInteractive ? "is-alive" : demoInteractive && !reduce ? "is-demo-idle" : "";

  return (
    <div
      className={`nur-stage ${demoInteractive ? "is-demo-interactive" : ""} ${className}`}
      style={demoInteractive ? { touchAction: "pan-y" } : undefined}
      aria-hidden={demoInteractive ? undefined : true}
    >
      {demoInteractive && tapped ? (
        <span className="nur-demo-bubble" role="status">
          Tap me in the mushaf
        </span>
      ) : null}
      <span className="nur-halo" />
      <span className="nur-floor" />
      {demoInteractive ? (
        <button
          type="button"
          className={`nur-orb ${bob} ${tapped ? "is-tapped" : ""}`}
          aria-label={`Preview ${COMPANION_NAME}. Tap for a quick hello.`}
          onClick={onDemoTap}
        >
          <Image src={NUR_SRC} alt={alt} width={140} height={140} draggable={false} className="nur-face" style={{ filter }} />
          <span className="nur-gloss" />
        </button>
      ) : (
        <span className={`nur-orb ${bob} ${tapped ? "is-tapped" : ""}`}>
          <Image src={NUR_SRC} alt={alt} width={140} height={140} draggable={false} className="nur-face" style={{ filter }} />
          <span className="nur-gloss" />
        </span>
      )}
    </div>
  );
}
