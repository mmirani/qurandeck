import { parseFeedbackId, type FeedbackMutation, type FeedbackMutations } from "@/lib/feedback";
import { adminStatsStatus } from "@/lib/usage";

/** Same ADMIN_EMAILS rule as /admin/stats. Anyone else is a 404. */
export function feedbackAdminStatus(email: string | null | undefined, raw = process.env.ADMIN_EMAILS ?? ""): 200 | 404 {
  return adminStatsStatus(email, raw);
}

/**
 * Admin check before any write. A non-admin never reaches the store.
 * Server actions call this with the session email. Kept out of the client bundle
 * because the admin check lives next to usage hashing, which needs node:crypto.
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
