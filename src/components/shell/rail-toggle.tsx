"use client";

import { PanelLeft, PanelLeftClose, PanelRight, PanelRightClose } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";

export function RailToggle({ side, compact }: { side: "nav" | "study"; compact?: boolean }) {
  const { preferences, updatePreferences } = useMushaf();
  const open = side === "nav" ? preferences.showNavRail : preferences.showStudyRail;
  const label = side === "nav"
    ? open
      ? "Hide surah column"
      : "Show surah column"
    : open
      ? "Hide study column"
      : "Show study column";
  const Icon =
    side === "nav"
      ? open
        ? PanelLeftClose
        : PanelLeft
      : open
        ? PanelRightClose
        : PanelRight;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() =>
        updatePreferences(side === "nav" ? { showNavRail: !open } : { showStudyRail: !open })
      }
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center border border-gold/45 text-gold hover:bg-gold/15 ${
        compact ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl"
      }`}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

export function RailStrip({ side }: { side: "nav" | "study" }) {
  return (
    <div className="mushaf-rail flex h-full w-full flex-col items-center pt-3" data-tour={side === "study" ? "study" : undefined}>
      <RailToggle side={side} compact />
    </div>
  );
}
