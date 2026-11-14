import Link from "next/link";
import { FeedbackEmptyState, FeedbackInbox, FeedbackUnavailable, type FeedbackInboxActions } from "@/components/admin/feedback-inbox";
import { InboxLink } from "@/components/admin/inbox-link";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { FEEDBACK_PAGE_SIZE, feedbackWindow, type FeedbackMessage } from "@/lib/feedback";

export function FeedbackAdminScreen({
  messages,
  total,
  shown,
  unread,
  unavailable,
  actions,
}: {
  messages: FeedbackMessage[];
  total: number;
  shown: number;
  unread: number | null;
  unavailable: boolean;
  actions: FeedbackInboxActions;
}) {
  const nextShown = feedbackWindow(String(shown + FEEDBACK_PAGE_SIZE));

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="qd-gutter mx-auto flex min-h-16 max-w-3xl flex-wrap items-center gap-3 py-2">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
          <nav aria-label="Admin" className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href="/admin/stats"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink"
            >
              Usage
            </Link>
            <InboxLink unread={unread} current />
          </nav>
        </div>
      </header>
      <main id="main-content" className="qd-gutter qd-section mx-auto flex max-w-3xl flex-col gap-6">
        <div className="qd-stack">
          <p className="kufic-label text-gold-deep">Private</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Inbox</h1>
          <p className="max-w-2xl text-sm leading-6 text-ink-soft">Messages from the contact page, newest first.</p>
        </div>
        {unavailable ? (
          <FeedbackUnavailable />
        ) : total === 0 ? (
          <FeedbackEmptyState />
        ) : (
          <>
            <FeedbackInbox messages={messages} actions={actions} />
            {total > messages.length && nextShown > shown ? (
              <Link
                href={`/admin/feedback?shown=${nextShown}`}
                className="inline-flex min-h-11 items-center justify-center self-start rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink"
              >
                Load more
              </Link>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
