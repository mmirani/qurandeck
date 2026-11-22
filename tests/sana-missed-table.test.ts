import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { missedSchemaStatements, onceWithRetry } from "../src/lib/sana-missed";

const flat = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

describe("Sana missed table setup", () => {
  it("only uses statements that are safe to run again", () => {
    const statements = missedSchemaStatements();
    assert.ok(statements.some((s) => /create table if not exists sana_missed_daily/.test(flat(s))));
    assert.ok(statements.some((s) => /create index if not exists sana_missed_daily_day_idx/.test(flat(s))));
    for (const statement of statements) {
      const s = flat(statement);
      assert.ok(/^create (table|index) if not exists /.test(s) || /on conflict \(id\) do nothing$/.test(s), s);
      assert.doesNotMatch(s, /\b(drop|alter|truncate|delete)\b/);
    }
  });

  it("matches the migration file", () => {
    const file = flat(readFileSync(new URL("../migrations/0001_sana_missed_daily.sql", import.meta.url), "utf8").replace(/--.*$/gm, ""));
    for (const statement of missedSchemaStatements()) assert.ok(file.includes(flat(statement)), flat(statement));
  });

  it("runs setup once, shares the in-flight call, and fails safe", async () => {
    let calls = 0;
    const ensure = onceWithRetry(async () => {
      calls += 1;
    });
    assert.deepEqual(await Promise.all([ensure(), ensure(), ensure()]), [true, true, true]);
    assert.equal(await ensure(), true);
    assert.equal(calls, 1);
  });

  it("returns false on failure and retries only after the wait", async () => {
    let now = 0;
    let calls = 0;
    let fail = true;
    const ensure = onceWithRetry(
      async () => {
        calls += 1;
        if (fail) throw new Error("db down");
      },
      1000,
      () => now,
    );
    assert.equal(await ensure(), false);
    now = 500;
    assert.equal(await ensure(), false);
    assert.equal(calls, 1);
    fail = false;
    now = 1500;
    assert.equal(await ensure(), true);
    assert.equal(await ensure(), true);
    assert.equal(calls, 2);
  });
});
