import Link from "next/link";

export function InboxLink({
  unread,
  current = false,
  className = "",
}: {
  unread: number | null;
  current?: boolean;
  className?: string;
}) {
  const label =
    unread == null
      ? "Inbox"
      : unread === 0
        ? "Inbox, no unread messages"
        : unread === 1
          ? "Inbox, 1 unread message"
          : `Inbox, ${unread} unread messages`;
  const count = unread != null && unread > 99 ? "99+" : unread;

  return (
    <Link
      href="/admin/feedback"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium text-ink ${
        current ? "border-gold bg-highlight" : "border-line bg-surface"
      } ${className}`}
    >
      <span aria-hidden="true">Inbox</span>
      {typeof count === "number" || count === "99+" ? (
        <span
          aria-hidden="true"
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums ${
            unread != null && unread > 0 ? "bg-gold text-on-gold" : "bg-canvas text-ink"
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
