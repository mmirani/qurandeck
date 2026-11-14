"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { feedbackIsLong, formatFeedbackTime, type FeedbackMessage } from "@/lib/feedback";

export type FeedbackInboxActions = {
  setRead: (id: number, read: boolean) => Promise<{ ok: boolean }>;
  remove: (id: number) => Promise<{ ok: boolean }>;
};

const buttonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium disabled:cursor-wait disabled:opacity-60";

export function FeedbackEmptyState() {
  return <p className="rounded-3xl border border-line bg-surface px-5 py-8 text-base text-ink">No messages yet.</p>;
}

export function FeedbackUnavailable() {
  return <p className="text-base text-ink">Messages are unavailable right now.</p>;
}

export function FeedbackInbox({
  messages,
  actions,
}: {
  messages: FeedbackMessage[];
  actions: FeedbackInboxActions;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeedbackMessage | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function mark(message: FeedbackMessage) {
    const read = message.readAt == null;
    setBusyId(message.id);
    setNotice("");
    try {
      const result = await actions.setRead(message.id, read);
      setNotice(result.ok ? (read ? "Marked as read." : "Marked as unread.") : "That message could not be updated. Try again.");
    } catch {
      setNotice("That message could not be updated. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const message = pendingDelete;
    setBusyId(message.id);
    setNotice("");
    try {
      const result = await actions.remove(message.id);
      if (result.ok) {
        setPendingDelete(null);
        setNotice("Message deleted.");
      } else {
        setNotice("That message could not be deleted. Try again.");
      }
    } catch {
      setNotice("That message could not be deleted. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className={notice ? "text-sm text-ink" : "sr-only"}>
        {notice}
      </p>
      <ul className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            open={openId === message.id}
            busy={busyId === message.id}
            onToggle={() => setOpenId((current) => (current === message.id ? null : message.id))}
            onMark={() => void mark(message)}
            onDelete={() => setPendingDelete(message)}
          />
        ))}
      </ul>
      {pendingDelete ? (
        <Modal title="Delete this message?" eyebrow="Inbox" onClose={() => setPendingDelete(null)}>
          <p className="text-base leading-7 text-ink">This removes the message from the inbox. It cannot be undone.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={`${buttonClass} border-line text-ink`} onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${buttonClass} border-danger text-danger`}
              disabled={busyId === pendingDelete.id}
              onClick={() => void confirmDelete()}
            >
              Delete
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function MessageCard({
  message,
  open,
  busy,
  onToggle,
  onMark,
  onDelete,
}: {
  message: FeedbackMessage;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onMark: () => void;
  onDelete: () => void;
}) {
  const who = message.name?.trim() || "No name";
  const long = feedbackIsLong(message.message);
  const readLabel = message.readAt ? "Mark unread" : "Mark read";
  const bodyId = `feedback-message-${message.id}`;

  return (
    <li>
      <article
        aria-labelledby={`feedback-who-${message.id}`}
        data-unread={message.readAt ? "false" : "true"}
        className={`qd-pad flex flex-col gap-3 rounded-3xl border bg-surface ${message.readAt ? "border-line" : "border-gold"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h2 id={`feedback-who-${message.id}`} className="font-display text-xl font-semibold text-ink">
            {who}
          </h2>
          <time dateTime={message.createdAt} className="text-sm text-ink-soft">
            {formatFeedbackTime(message.createdAt)}
          </time>
        </div>
        {message.email ? (
          <a
            href={`mailto:${encodeURIComponent(message.email)}`}
            className="inline-flex min-h-11 max-w-full items-center break-all text-gold-deep underline underline-offset-4"
          >
            {message.email}
          </a>
        ) : (
          <p className="text-sm text-ink-soft">No email</p>
        )}
        <p className="text-sm font-medium text-ink">{message.readAt ? `Read ${formatFeedbackTime(message.readAt)}` : "Unread"}</p>
        <p id={bodyId} className={`break-words text-base leading-7 text-ink ${long && !open ? "line-clamp-6 whitespace-pre-wrap" : "whitespace-pre-wrap"}`}>
          {message.message}
        </p>
        <div className="flex flex-wrap gap-2">
          {long ? (
            <button
              type="button"
              className={`${buttonClass} border-line text-gold-deep`}
              aria-expanded={open}
              aria-controls={bodyId}
              aria-label={`${open ? "Show less" : "Show more"} of message from ${who}`}
              onClick={onToggle}
            >
              {open ? "Show less" : "Show more"}
            </button>
          ) : null}
          <button
            type="button"
            className={`${buttonClass} border-line text-ink`}
            aria-label={`${readLabel}, message from ${who}`}
            disabled={busy}
            onClick={onMark}
          >
            {readLabel}
          </button>
          <button
            type="button"
            className={`${buttonClass} border-line text-danger`}
            aria-label={`Delete message from ${who}`}
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </article>
    </li>
  );
}
