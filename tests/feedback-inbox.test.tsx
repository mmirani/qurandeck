import "./register-dom.ts";
import assert from "node:assert/strict";

if (typeof globalThis.self === "undefined") {
  Object.defineProperty(globalThis, "self", { value: globalThis, configurable: true });
}
import { afterEach, describe, it } from "node:test";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ContactForm } from "../src/app/contact/contact-form";
import { FeedbackEmptyState, FeedbackInbox, type FeedbackInboxActions } from "../src/components/admin/feedback-inbox";
import { FeedbackAdminScreen } from "../src/components/admin/feedback-screen";
import { InboxLink } from "../src/components/admin/inbox-link";
import { formatFeedbackTime, type FeedbackMessage } from "../src/lib/feedback";

const ada: FeedbackMessage = {
  id: 2,
  name: "Ada",
  email: "ada@example.com",
  message: "The translation jumps on the last line.",
  createdAt: "2026-11-14T04:14:00.000Z",
  readAt: null,
};

const quiet: FeedbackMessage = {
  id: 1,
  name: null,
  email: null,
  message: ["One", "Two", "Three", "Four", "Five", "Six", "Seven stays hidden until asked."].join("\n"),
  createdAt: "2026-11-13T04:14:00.000Z",
  readAt: "2026-11-13T05:00:00.000Z",
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
  });
}

function buttons(label: string, scope: ParentNode = document) {
  return [...scope.querySelectorAll("button")].filter((item) => {
    const name = item.getAttribute("aria-label") ?? item.textContent?.trim() ?? "";
    return name === label || name.startsWith(`${label},`) || name.startsWith(`${label} `);
  });
}

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  host?.remove();
  root = null;
  host = null;
});

describe("feedback inbox view", () => {
  it("shows the empty state, a mailto link, a time, and clamps a long message", async () => {
    await render(<FeedbackEmptyState />);
    assert.equal(document.body.textContent?.includes("No messages yet."), true);
    await act(async () => {
      root?.render(
        <FeedbackInbox
          messages={[ada, quiet]}
          actions={{
            async setRead() {
              return { ok: true };
            },
            async remove() {
              return { ok: true };
            },
          }}
        />,
      );
    });

    assert.equal(document.querySelector("h2")?.textContent, "Ada");
    const link = document.querySelector("a[href^='mailto:']");
    assert.equal(link?.tagName, "A");
    assert.equal(link?.getAttribute("href"), "mailto:ada%40example.com");
    assert.equal(link.textContent, "ada@example.com");
    const time = document.querySelector("time");
    assert.equal(time?.getAttribute("dateTime"), ada.createdAt);
    assert.equal(time?.textContent, formatFeedbackTime(ada.createdAt));
    assert.equal(document.body.textContent?.includes("Unread"), true);
    assert.equal(document.body.textContent?.includes("No email"), true);
    assert.equal(document.body.textContent?.includes("Seven stays hidden until asked."), true);
    const collapsed = document.getElementById("feedback-message-1");
    assert.equal(collapsed?.className.includes("line-clamp-6"), true);

    await act(async () => {
      buttons("Show more")[0]?.click();
    });
    assert.equal(document.getElementById("feedback-message-1")?.className.includes("line-clamp-6"), false);
    assert.equal(buttons("Show less").length, 1);
  });

  it("asks before deleting and marks a message read", async () => {
    const calls: string[] = [];
    const actions: FeedbackInboxActions = {
      async setRead(id, read) {
        calls.push(`read:${id}:${read}`);
        return { ok: true };
      },
      async remove(id) {
        calls.push(`delete:${id}`);
        return { ok: true };
      },
    };
    await render(<FeedbackInbox messages={[ada]} actions={actions} />);

    await act(async () => {
      buttons("Delete")[0]?.click();
    });
    const dialog = document.querySelector("[role='dialog']");
    assert.ok(dialog);
    assert.equal(dialog.textContent?.includes("This removes the message from the inbox."), true);
    assert.equal(document.activeElement?.textContent, "Cancel");
    await act(async () => {
      buttons("Cancel", dialog)[0]?.click();
    });
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.deepEqual(calls, []);

    await act(async () => {
      buttons("Delete")[0]?.click();
    });
    const open = document.querySelector("[role='dialog']");
    assert.ok(open);
    await act(async () => {
      buttons("Delete", open)[0]?.click();
    });
    assert.deepEqual(calls, ["delete:2"]);
    assert.equal(document.body.textContent?.includes("Message deleted."), true);

    await act(async () => {
      buttons("Mark read")[0]?.click();
    });
    assert.deepEqual(calls, ["delete:2", "read:2:true"]);
    assert.equal(document.body.textContent?.includes("Marked as read."), true);
  });

  it("offers another page of 50 when more messages are stored", async () => {
    const actions: FeedbackInboxActions = {
      async setRead() {
        return { ok: true };
      },
      async remove() {
        return { ok: true };
      },
    };
    await render(<FeedbackAdminScreen messages={[ada]} total={51} shown={50} unread={1} unavailable={false} actions={actions} />);
    const more = document.querySelector("a[href='/admin/feedback?shown=100']");
    assert.equal(more?.textContent?.trim(), "Load more");
  });

  it("links the unread count to the inbox", async () => {
    await render(<InboxLink unread={3} />);
    const link = document.querySelector("a");
    assert.equal(link?.getAttribute("href"), "/admin/feedback");
    assert.equal(link?.getAttribute("aria-label"), "Inbox, 3 unread messages");
    assert.equal(link?.textContent?.includes("3"), true);
    await act(async () => {
      root?.render(<InboxLink unread={0} />);
    });
    assert.equal(document.querySelector("a")?.getAttribute("aria-label"), "Inbox, no unread messages");
  });
});

describe("contact form", () => {
  const original = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = original;
  });

  it("says the message was sent after the note is accepted", async () => {
    const bodies: string[] = [];
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    await render(<ContactForm />);
    const textarea = document.querySelector("textarea");
    assert.ok(textarea);
    await act(async () => {
      const proto = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), "value");
      proto?.set?.call(textarea, "A short note for the inbox.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const form = document.querySelector("form");
    assert.ok(form);
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(document.body.textContent?.includes("Thank you. Your message was sent."), true);
    assert.equal(document.body.textContent?.includes("The note is saved."), false);
    assert.equal(bodies.length, 1);
    const sent = JSON.parse(bodies[0] ?? "{}") as { name?: string; email?: string; message?: string };
    assert.deepEqual(Object.keys(sent).sort(), ["email", "message", "name"]);
    assert.equal(sent.message, "A short note for the inbox.");
  });
});
