export const STUDY_CARD_IDS = ["account", "notes", "highlights"] as const;

export type StudyCardId = (typeof STUDY_CARD_IDS)[number];

export type StudyCards = Record<StudyCardId, boolean>;

export const defaultStudyCards: StudyCards = {
  account: true,
  notes: true,
  highlights: true,
};

export function allStudyCards(open: boolean): StudyCards {
  return {
    account: open,
    notes: open,
    highlights: open,
  };
}

export function mergeStudyCards(
  current: Partial<StudyCards> | undefined,
  patch?: Partial<StudyCards>,
): StudyCards {
  return { ...defaultStudyCards, ...current, ...patch };
}
