import { test } from "node:test";
import assert from "node:assert/strict";
import { rankPage } from "../src/lib/reading";

const items = Array.from({ length: 12 }, (_, index) => index + 1);

test("pages hold five rows and never more", () => {
  assert.deepEqual(rankPage(items, 0).items, [1, 2, 3, 4, 5]);
  assert.deepEqual(rankPage(items, 2).items, [11, 12]);
  assert.equal(rankPage(items, 0).pages, 3);
});

test("a page past the end clamps to the last page", () => {
  const page = rankPage(items, 9);
  assert.equal(page.page, 2);
  assert.deepEqual(page.items, [11, 12]);
});

test("short and empty lists are a single page", () => {
  assert.equal(rankPage([1, 2], 0).pages, 1);
  assert.equal(rankPage([], 3).pages, 1);
  assert.deepEqual(rankPage([], 3).items, []);
});
