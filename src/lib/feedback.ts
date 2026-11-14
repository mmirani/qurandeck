import { adminStatsStatus } from "@/lib/usage";

export const FEEDBACK_PAGE_SIZE = 50;
export const FEEDBACK_CLAMP_CHARS = 320;
export const FEEDBACK_CLAMP_LINES = 6;

export type FeedbackMessage = {
  id: number;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type FeedbackMutations = {
  setRead(id: number, read: boolean): Promise<boolean>;
  remove(id: number): Promise<boolean>;
};

export type FeedbackMutation =
  | { status: 404 }
  | { status: 400 }
  | { status: 200; ok: boolean };

/** Same ADMIN_EMAILS rule as /admin/stats. Anyone else is a 404. */
export function feedbackAdminStatus(email: string | null | undefined, raw = process.env.ADMIN_EMAILS ?? ""): 200 | 404 {
  return adminStatsStatus(email, raw);
}

export function parseFeedbackId(value: unknown): number | null {
  const id = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return id;
}

/** How many rows the inbox asks for. Starts at 50 and grows by 50. */
export function feedbackWindow(raw: string | string[] | undefined, pageSize = FEEDBACK_PAGE_SIZE): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= pageSize) return pageSize;
  const snapped = Math.ceil(parsed / pageSize) * pageSize;
  return Math.min(snapped, pageSize * 40);
}

export function feedbackIsLong(message: string, chars = FEEDBACK_CLAMP_CHARS, lines = FEEDBACK_CLAMP_LINES): boolean {
  if (message.length > chars) return true;
  let count = 1;
  for (let i = 0; i < message.length; i += 1) {
    if (message.charCodeAt(i) === 10) count += 1;
    if (count > lines) return true;
  }
  return false;
}

export function formatFeedbackTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function sortFeedbackNewest(rows: readonly FeedbackMessage[]): FeedbackMessage[] {
  return [...rows].sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    if (byTime !== 0) return byTime;
    return b.id - a.id;
  });
}

export function unreadFeedbackCount(rows: readonly FeedbackMessage[]): number {
  let count = 0;
  for (const row of rows) if (row.readAt == null) count += 1;
  return count;
}

/**
 * Admin check before any write. A non-admin never reaches the store.
 * The page and the server actions both call this with the session email.
 */
export async function mutateFeedback(input: {
  email: string | null | undefined;
  id: unknown;
  op: { type: "read"; read: boolean } | { type: "delete" };
  store: FeedbackMutations;
  allow?: string;
}): Promise<FeedbackMutation> {
  if (feedbackAdminStatus(input.email, input.allow) === 404) return { status: 404 };
  const id = parseFeedbackId(input.id);
  if (id == null) return { status: 400 };
  if (input.op.type === "read") {
    const ok = await input.store.setRead(id, input.op.read);
    return { status: 200, ok };
  }
  const ok = await input.store.remove(id);
  return { status: 200, ok };
}
