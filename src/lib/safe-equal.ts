import { createHash, timingSafeEqual } from "node:crypto";

/** Compare strings without leaking the secret through an early mismatch. */
export function safeEqual(left: string, right: string) {
  const a = createHash("sha256").update(left, "utf8").digest();
  const b = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}
