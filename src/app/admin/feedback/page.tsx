import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { deleteFeedbackAction, setFeedbackReadAction } from "@/app/admin/feedback/actions";
import { FeedbackAdminScreen } from "@/components/admin/feedback-screen";
import { feedbackWindow, type FeedbackMessage } from "@/lib/feedback";
import { countUnreadFeedback, listFeedback } from "@/lib/feedback-store";
import { adminStatsStatus } from "@/lib/usage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ shown?: string | string[] }>;
}) {
  const query = await searchParams;
  let email: string | null = null;
  try {
    const session = await auth();
    email = session?.user?.email ?? null;
  } catch {
    console.error("Admin inbox sign-in check failed");
    notFound();
  }
  if (adminStatsStatus(email) === 404) notFound();

  const shown = feedbackWindow(query.shown);
  let messages: FeedbackMessage[] = [];
  let total = 0;
  let unread: number | null = null;
  let unavailable = false;
  try {
    const [page, unreadCount] = await Promise.all([listFeedback({ limit: shown, offset: 0 }), countUnreadFeedback()]);
    messages = page.messages;
    total = page.total;
    unread = unreadCount;
  } catch {
    console.error("Feedback inbox failed");
    unavailable = true;
  }

  return (
    <FeedbackAdminScreen
      messages={messages}
      total={total}
      shown={shown}
      unread={unread}
      unavailable={unavailable}
      actions={{ setRead: setFeedbackReadAction, remove: deleteFeedbackAction }}
    />
  );
}
