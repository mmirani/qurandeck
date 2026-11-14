"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { mutateFeedback, type FeedbackMutation } from "@/lib/feedback";
import { adminStatsStatus } from "@/lib/usage";
import { deleteFeedback, setFeedbackRead } from "@/lib/feedback-store";

async function sessionEmail() {
  try {
    const session = await auth();
    return session?.user?.email ?? null;
  } catch {
    console.error("Admin inbox sign-in check failed");
    notFound();
  }
}

function mutations() {
  return {
    setRead: (id: number, read: boolean) => setFeedbackRead(id, read),
    remove: (id: number) => deleteFeedback(id),
  };
}

async function finish(result: FeedbackMutation) {
  if (result.status === 404) notFound();
  if (result.status !== 200 || !result.ok) return { ok: false as const };
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/stats");
  return { ok: true as const };
}

export async function setFeedbackReadAction(id: number, read: boolean) {
  const email = await sessionEmail();
  if (adminStatsStatus(email) === 404) notFound();
  return finish(await mutateFeedback({ email, id, op: { type: "read", read }, store: mutations() }));
}

export async function deleteFeedbackAction(id: number) {
  const email = await sessionEmail();
  if (adminStatsStatus(email) === 404) notFound();
  return finish(await mutateFeedback({ email, id, op: { type: "delete" }, store: mutations() }));
}
