"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { allStudyCards, STUDY_CARD_IDS, type StudyCardId } from "@/lib/study-cards";

export function StudyCardControls() {
  const { preferences, updatePreferences } = useMushaf();
  const openCount = STUDY_CARD_IDS.filter((id) => preferences.studyCards[id]).length;
  const noneOpen = openCount === 0;
  const allOpen = openCount === STUDY_CARD_IDS.length;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={noneOpen}
        onClick={() => updatePreferences({ studyCards: allStudyCards(false) })}
        className="h-10 flex-1 cursor-pointer rounded-full border border-gold/40 text-sm text-gold-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        Collapse all
      </button>
      <button
        type="button"
        disabled={allOpen}
        onClick={() => updatePreferences({ studyCards: allStudyCards(true) })}
        className="h-10 flex-1 cursor-pointer rounded-full border border-gold/40 text-sm text-gold-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        Expand all
      </button>
    </div>
  );
}

export function RailCard({
  id,
  title,
  extra,
  children,
}: {
  id: StudyCardId;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const { preferences, updatePreferences } = useMushaf();
  const open = preferences.studyCards[id];

  return (
    <section className="rail-card rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`study-card-${id}`}
          onClick={() =>
            updatePreferences({ studyCards: { ...preferences.studyCards, [id]: !open } })
          }
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
        >
          <h2 className="section-heading text-gold">{title}</h2>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gold-deep transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        {extra}
      </div>
      {open ? <div id={`study-card-${id}`}>{children}</div> : null}
    </section>
  );
}
