import assert from "node:assert/strict";
import test from "node:test";
import { companionFilterFromGold } from "../src/lib/companion";

test("light pages deepen Sana so the body can clear the background", () => {
  const filter = companionFilterFromGold("#34baab", "#e4dcff");
  assert.match(filter, /brightness\(0\.5\)/);
  assert.match(filter, /contrast\(1\.48\)/);
  assert.match(filter, /hue-rotate\(/);
});

test("dark pages keep Sana's bright glow", () => {
  const filter = companionFilterFromGold("#e879f9", "#07060c");
  assert.match(filter, /brightness\(1\.06\)/);
  assert.doesNotMatch(filter, /brightness\(0\.5\)/);
  assert.doesNotMatch(filter, /contrast\(1\.48\)/);
});

test("a near-gray theme stays grayscale instead of picking up a hue", () => {
  const filter = companionFilterFromGold("#111111", "#ffffff");
  assert.match(filter, /grayscale\(/);
  assert.match(filter, /brightness\(0\.52\)/);
});
