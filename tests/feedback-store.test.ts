import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { feedbackAdminStatus, mutateFeedback } from "../src/lib/feedback-admin";
import {
  feedbackIsLong,
  feedbackWindow,
  formatFeedbackTime,
  parseFeedbackId,
  sortFeedbackNewest,
  unreadFeedbackCount,
  type FeedbackMessage,
  type FeedbackMutations,
} from "../src/lib/feedback";
import { createFeedbackStore, feedbackSchemaStatements, mapFeedbackRow, type FeedbackSql } from "../src/lib/feedback-store";
import { adminStatsStatus } from "../src/lib/usage";

const FORBIDDEN = ["ip_address", "user_agent", "user-agent", "x-forwarded-for", "remote_addr", "city", "region", "anon_id"];

type Stored = {
  id: number;
  name: string | null;
  email: string | null;
  message: string;
  created_at: Date;
  read_at: Date | null;
};

function createFakeDb(initial: Stored[] = []) {
  const rows = initial.map((row) => ({ ...row }));
  let nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  let clock = Date.parse("2026-11-01T00:00:00.000Z");
  const texts: string[] = [];

  const run = async (raw: string, values: unknown[]) => {
    const text = raw.replace(/\s+/g, " ").trim();
    texts.push(text);
    if (/^(CREATE|ALTER|INSERT INTO schema_migrations)/i.test(text)) return [];
    if (/^INSERT INTO feedback \(name, email, message\)/i.test(text)) {
      assert.equal(values.length, 3);
      clock += 60_000;
      const [name, email, message] = values;
      rows.push({
        id: nextId++,
        name: typeof name === "string" ? name : null,
        email: typeof email === "string" ? email : null,
        message: String(message),
        created_at: new Date(clock),
        read_at: null,
      });
      return [];
    }
    if (/^SELECT id, name, email, message, created_at, read_at/i.test(text)) {
      const limit = Number(values[0]);
      const offset = Number(values[1]);
      const ordered = /order by created_at desc, id desc/i.test(text)
        ? [...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || b.id - a.id)
        : [...rows];
      return ordered.slice(offset, offset + limit).map(serialize);
    }
    if (/^SELECT count\(\*\)::int AS unread/i.test(text)) {
      assert.match(text, /read_at IS NULL/i);
      return [{ unread: rows.filter((row) => row.read_at == null).length }];
    }
    if (/^SELECT count\(\*\)::int AS total/i.test(text)) {
      return [{ total: String(rows.length) }];
    }
    if (/^UPDATE feedback SET read_at = COALESCE\(read_at, now\(\)\)/i.test(text)) {
      const id = Number(values[0]);
      const row = rows.find((item) => item.id === id);
      if (!row) return [];
      row.read_at ??= new Date("2026-11-14T04:14:00.000Z");
      return [{ id }];
    }
    if (/^UPDATE feedback SET read_at = NULL/i.test(text)) {
      const id = Number(values[0]);
      const row = rows.find((item) => item.id === id);
      if (!row) return [];
      row.read_at = null;
      return [{ id }];
    }
    if (/^DELETE FROM feedback/i.test(text)) {
      const id = Number(values[0]);
      const index = rows.findIndex((item) => item.id === id);
      if (index < 0) return [];
      rows.splice(index, 1);
      return [{ id }];
    }
    throw new Error(`Unhandled SQL: ${text}`);
  };

  const sql = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => run(strings.join(" "), values), {
    query: (text: string, params?: unknown[]) => run(text, params ?? []),
  }) as FeedbackSql;
  return { sql, texts, rows };
}

function serialize(row: Stored): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    created_at: row.created_at,
    read_at: row.read_at,
  };
}

function seeded(id: number, createdAt: string, message: string, readAt: string | null = null): Stored {
  return {
    id,
    name: `Person ${id}`,
    email: `person${id}@example.com`,
    message,
    created_at: new Date(createdAt),
    read_at: readAt ? new Date(readAt) : null,
  };
}

function guardStore(): FeedbackMutations & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async setRead() {
      calls.push("setRead");
      throw new Error("store should not be called");
    },
    async remove() {
      calls.push("remove");
      throw new Error("store should not be called");
    },
  };
}

describe("feedback schema", () => {
  it("adds a nullable read_at column and does not store a sender address or browser", () => {
    const statements = feedbackSchemaStatements();
    const sql = statements.join("\n");
    assert.match(sql, /ALTER TABLE feedback ADD COLUMN IF NOT EXISTS read_at timestamptz/);
    const alter = statements.find((statement) => statement.includes("read_at"));
    assert.ok(alter);
    assert.equal(/not null/i.test(alter), false);
    assert.match(sql, /feedback-v1/);
    assert.match(sql, /feedback-v2/);
    assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/);
    const lowered = sql.toLowerCase();
    for (const token of FORBIDDEN) assert.equal(lowered.includes(token), false, token);
  });
});

describe("feedback store", () => {
  it("lists newest first, pages by 50, and keeps read and delete on name, email, and message only", async () => {
    const initial = [
      seeded(2, "2026-11-10T00:00:00.000Z", "older", "2026-11-10T01:00:00.000Z"),
      seeded(5, "2026-11-12T00:00:00.000Z", "newest"),
      seeded(4, "2026-11-11T00:00:00.000Z", "middle"),
    ];
    const db = createFakeDb(initial);
    const store = createFeedbackStore(db.sql);

    const first = await store.list({ limit: 50, offset: 0 });
    assert.deepEqual(
      first.messages.map((message) => message.id),
      [5, 4, 2],
    );
    assert.equal(first.total, 3);
    assert.equal(first.messages[0]?.readAt, null);
    assert.equal(first.messages[2]?.readAt, "2026-11-10T01:00:00.000Z");
    assert.equal(await store.countUnread(), 2);

    assert.equal(await store.setRead(5, true), true);
    assert.equal(await store.countUnread(), 1);
    assert.ok(db.rows.find((row) => row.id === 5)?.read_at);
    const stamped = db.rows.find((row) => row.id === 5)?.read_at?.toISOString();
    assert.equal(await store.setRead(5, true), true);
    assert.equal(db.rows.find((row) => row.id === 5)?.read_at?.toISOString(), stamped);

    assert.equal(await store.setRead(5, false), true);
    assert.equal(db.rows.find((row) => row.id === 5)?.read_at, null);
    assert.equal(await store.countUnread(), 2);

    assert.equal(await store.remove(4), true);
    assert.equal(await store.remove(4), false);
    assert.equal(await store.countUnread(), 1);
    const afterDelete = await store.list();
    assert.deepEqual(
      afterDelete.messages.map((message) => message.id),
      [5, 2],
    );

    await store.save({ name: "Ada", email: null, message: "A note about the type." });
    const saved = db.rows.find((row) => row.message === "A note about the type.");
    assert.ok(saved);
    assert.equal(saved.email, null);
    assert.equal(saved.read_at, null);
    assert.equal(Object.keys(saved).includes("ip"), false);

    const many = createFakeDb(Array.from({ length: 60 }, (_, index) => seeded(index + 1, new Date(Date.UTC(2026, 0, index + 1)).toISOString(), `Note ${index}`)));
    const paged = createFeedbackStore(many.sql);
    const page = await paged.list({ limit: 50, offset: 0 });
    assert.equal(page.messages.length, 50);
    assert.equal(page.total, 60);
    assert.equal(page.messages[0]?.id, 60);
    assert.equal(page.messages[49]?.id, 11);
    const rest = await paged.list({ limit: 50, offset: 50 });
    assert.equal(rest.messages.length, 10);
    assert.equal(rest.messages[0]?.id, 10);

    const joined = db.texts.join("\n").toLowerCase();
    assert.match(joined, /insert into feedback \(name, email, message\)/);
    assert.match(joined, /order by created_at desc, id desc/);
    for (const token of FORBIDDEN) assert.equal(joined.includes(token), false, token);
  });

  it("maps stored rows without copying extra columns", () => {
    const mapped = mapFeedbackRow({
      id: "7",
      name: "Ada",
      email: null,
      message: "Hello",
      created_at: "2026-11-14T04:14:00.000Z",
      read_at: null,
      ip_address: "203.0.113.4",
      user_agent: "secret",
    });
    assert.deepEqual(mapped, {
      id: 7,
      name: "Ada",
      email: null,
      message: "Hello",
      createdAt: "2026-11-14T04:14:00.000Z",
      readAt: null,
    });
    assert.throws(() => mapFeedbackRow({ id: 1, name: null, email: null, message: null, created_at: "2026-11-14T00:00:00.000Z" }));
  });
});

describe("feedback inbox rules", () => {
  const allow = "owner@example.com, second@example.com";

  it("uses the same admin gate as stats", () => {
    for (const email of ["owner@example.com", "OWNER@EXAMPLE.COM", "other@example.com", "owner@example.com.evil", null, undefined, ""]) {
      assert.equal(feedbackAdminStatus(email, allow), adminStatsStatus(email, allow));
    }
    assert.equal(feedbackAdminStatus("owner@example.com", ""), 404);
    assert.equal(feedbackWindow(undefined), 50);
    assert.equal(feedbackWindow("10"), 50);
    assert.equal(feedbackWindow("51"), 100);
    assert.equal(feedbackWindow(["80"], 50), 100);
    assert.equal(feedbackWindow("99999"), 2000);
    assert.equal(parseFeedbackId(4), 4);
    assert.equal(parseFeedbackId("12"), 12);
    assert.equal(parseFeedbackId(0), null);
    assert.equal(parseFeedbackId(1.5), null);
    assert.equal(parseFeedbackId(-3), null);
    assert.equal(parseFeedbackId("nope"), null);
    assert.equal(feedbackIsLong("short"), false);
    assert.equal(feedbackIsLong("x".repeat(321)), true);
    assert.equal(feedbackIsLong(["1", "2", "3", "4", "5", "6", "7"].join("\n")), true);
    const formatted = formatFeedbackTime("2026-11-14T04:14:00.000Z");
    assert.match(formatted, /2026/);
    assert.match(formatted, /UTC/);
    assert.equal(formatFeedbackTime("not-a-date"), "");
  });

  it("refuses a write from anyone who is not an owner before touching the store", async () => {
    const store = guardStore();
    for (const email of [null, undefined, "other@example.com", "owner@example.com.evil"]) {
      const result = await mutateFeedback({ email, id: 3, op: { type: "delete" }, store, allow });
      assert.equal(result.status, 404);
    }
    const read = await mutateFeedback({ email: "second@example.com", id: "nope", op: { type: "read", read: true }, store, allow });
    assert.equal(read.status, 400);
    assert.deepEqual(store.calls, []);

    const memory: FeedbackMessage[] = [
      {
        id: 3,
        name: "Ada",
        email: "ada@example.com",
        message: "Hello there",
        createdAt: "2026-11-14T04:14:00.000Z",
        readAt: null,
      },
    ];
    const live: FeedbackMutations = {
      async setRead(id, read) {
        const row = memory.find((item) => item.id === id);
        if (!row) return false;
        row.readAt = read ? row.readAt ?? "2026-11-14T05:00:00.000Z" : null;
        return true;
      },
      async remove(id) {
        const index = memory.findIndex((item) => item.id === id);
        if (index < 0) return false;
        memory.splice(index, 1);
        return true;
      },
    };
    const marked = await mutateFeedback({ email: "owner@example.com", id: 3, op: { type: "read", read: true }, store: live, allow });
    assert.deepEqual(marked, { status: 200, ok: true });
    assert.equal(unreadFeedbackCount(memory), 0);
    assert.deepEqual(
      sortFeedbackNewest(memory).map((row) => row.id),
      [3],
    );
    const removed = await mutateFeedback({ email: "owner@example.com", id: 3, op: { type: "delete" }, store: live, allow });
    assert.deepEqual(removed, { status: 200, ok: true });
    assert.equal(memory.length, 0);
    const missing = await mutateFeedback({ email: "owner@example.com", id: 3, op: { type: "delete" }, store: live, allow });
    assert.deepEqual(missing, { status: 200, ok: false });
  });

  it("gates the page and the actions the same way as stats, and tells the sender the message was sent", () => {
    const page = readFileSync("src/app/admin/feedback/page.tsx", "utf8");
    const body = page.slice(page.indexOf("export default"));
    assert.ok(body.indexOf("adminStatsStatus") >= 0);
    assert.ok(body.indexOf("adminStatsStatus") < body.indexOf("listFeedback("));
    assert.equal(body.includes("notFound()"), true);
    assert.equal(page.includes("No messages yet."), false);
    const empty = readFileSync("src/components/admin/feedback-inbox.tsx", "utf8");
    assert.equal(empty.includes("No messages yet."), true);
    assert.equal(empty.includes("feedback-admin"), false);
    assert.equal(empty.includes("node:crypto"), false);
    assert.equal(empty.includes("@/lib/usage"), false);

    const actions = readFileSync("src/app/admin/feedback/actions.ts", "utf8");
    for (const name of ["setFeedbackReadAction", "deleteFeedbackAction"]) {
      const start = actions.indexOf(`export async function ${name}`);
      const body = actions.slice(start, actions.indexOf("export async function", start + 10) === -1 ? undefined : actions.indexOf("export async function", start + 10));
      assert.ok(body.indexOf("adminStatsStatus") >= 0);
      assert.ok(body.indexOf("adminStatsStatus") < body.indexOf("mutateFeedback"));
      assert.equal(body.includes("notFound()"), true);
    }

    const stats = readFileSync("src/app/admin/stats/page.tsx", "utf8");
    const statsBody = stats.slice(stats.indexOf("export default"));
    assert.ok(statsBody.indexOf("adminStatsStatus") < statsBody.indexOf("countUnreadFeedback("));
    const link = readFileSync("src/components/admin/inbox-link.tsx", "utf8");
    assert.equal(link.includes('href="/admin/feedback"'), true);
    const usage = readFileSync("src/components/admin/usage-stats.tsx", "utf8");
    assert.equal(usage.includes("InboxLink"), true);

    const form = readFileSync("src/app/contact/contact-form.tsx", "utf8");
    assert.equal(form.includes("Thank you. Your message was sent."), true);
    assert.equal(form.includes("The note is saved."), false);

    const route = readFileSync("src/app/api/feedback/route.ts", "utf8");
    const routeSql = readFileSync("src/lib/feedback-store.ts", "utf8");
    for (const token of FORBIDDEN) {
      assert.equal(route.toLowerCase().includes(token), false, token);
      assert.equal(routeSql.toLowerCase().includes(token), false, token);
    }
  });
});
