import { GUIDE_VERSION, type TourId } from "./catalog";

const KEY = "al-mushaf-guide";
export const GUIDE_EVENT = "qurandeck-guide";

export type GuideProgress = {
  version: number;
  pendingWelcome: boolean;
  completedWelcome: boolean;
  seen: Partial<Record<TourId, string>>;
};

export const defaultGuideProgress: GuideProgress = {
  version: GUIDE_VERSION,
  pendingWelcome: false,
  completedWelcome: false,
  seen: {},
};

function parse(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadGuideProgress(): GuideProgress {
  const value = parse();
  if (!value || typeof value !== "object") return defaultGuideProgress;
  const raw = value as Partial<GuideProgress>;
  return {
    ...defaultGuideProgress,
    ...raw,
    version: typeof raw.version === "number" ? raw.version : GUIDE_VERSION,
    seen: raw.seen && typeof raw.seen === "object" ? raw.seen : {},
  };
}

export function saveGuideProgress(value: GuideProgress) {
  window.localStorage.setItem(KEY, JSON.stringify(value));
}

export function markLessonSeen(current: GuideProgress, id: TourId): GuideProgress {
  const next = {
    ...current,
    version: GUIDE_VERSION,
    seen: { ...current.seen, [id]: new Date().toISOString() },
  };
  saveGuideProgress(next);
  return next;
}

export function markWelcomeDone(current: GuideProgress): GuideProgress {
  const next = {
    ...current,
    version: GUIDE_VERSION,
    pendingWelcome: false,
    completedWelcome: true,
  };
  saveGuideProgress(next);
  return next;
}

export function queueWelcome(current: GuideProgress): GuideProgress {
  const next = { ...current, pendingWelcome: true, completedWelcome: false };
  saveGuideProgress(next);
  return next;
}

export function requestWelcomeTour() {
  queueWelcome(loadGuideProgress());
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: { type: "welcome" } }));
}
