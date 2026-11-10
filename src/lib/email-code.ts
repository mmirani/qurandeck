import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { createMagicToken } from "@/lib/magic-link";
import { rateLimitKey, type RateLimiter } from "@/lib/rate-limit";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CODE_LIMIT = 5;
export const EMAIL_CODE_IP_LIMIT = 20;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CODE_EXCHANGE_TTL_MS = 2 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailCodeRecord = {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

export interface EmailCodeStore {
  save(record: EmailCodeRecord): Promise<void>;
  /** Compare and consume. Wrong guesses increment attempts and burn the code at the limit. */
  take(
    email: string,
    codeHash: string,
    now: number,
    maxAttempts: number,
  ): Promise<"ok" | "missing" | "expired" | "mismatch" | "locked">;
  deleteHash(emailHash: string): Promise<number>;
}

export class MemoryEmailCodeStore implements EmailCodeStore {
  private rows = new Map<string, EmailCodeRecord>();

  async save(record: EmailCodeRecord) {
    this.rows.set(record.email, { ...record, attempts: record.attempts || 0 });
  }

  async deleteHash() {
    return 0;
  }

  async take(email: string, codeHash: string, now: number, maxAttempts: number) {
    const row = this.rows.get(email);
    if (!row) {
      const dummy = createHmac("sha256", "qurandeck-email-code").update("missing").digest("hex");
      const a = Buffer.from(dummy);
      const b = Buffer.from(codeHash.padEnd(a.length, "0").slice(0, a.length));
      timingSafeEqual(a, b.length === a.length ? b : a);
      return "missing";
    }
    if (now >= row.expiresAt) {
      this.rows.delete(email);
      return "expired";
    }
    if (row.attempts >= maxAttempts) {
      this.rows.delete(email);
      return "locked";
    }
    const actual = Buffer.from(row.codeHash);
    const given = Buffer.from(codeHash);
    const match = actual.length === given.length && timingSafeEqual(actual, given);
    if (!match) {
      row.attempts += 1;
      if (row.attempts >= maxAttempts) {
        this.rows.delete(email);
        return "locked";
      }
      return "mismatch";
    }
    this.rows.delete(email);
    return "ok";
  }
}

export function emailCodeHash(email: string, code: string, secret: string) {
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${code}`).digest("hex");
}

export function generateEmailCode(random: () => number = () => randomInt(0, 1_000_000)) {
  return String(random()).padStart(6, "0").slice(-6);
}

export type IssueEmailCodeInput = {
  email: string;
  ip: string;
  allowed: boolean;
  secret: string | undefined;
  hosted: boolean;
  hasEmailProvider: boolean;
  durableTokens?: boolean;
  limiter: RateLimiter;
  store: EmailCodeStore;
  sendEmail: (to: string, code: string) => Promise<boolean>;
  now?: number;
  random?: () => number;
};

export type IssueEmailCodeBody = {
  ok: boolean;
  error?: string;
  emailed?: boolean;
  devCode?: string;
};

export type IssueEmailCodeResult = {
  status: number;
  body: IssueEmailCodeBody;
  retryAfterSec?: number;
};

function result(
  status: number,
  body: IssueEmailCodeBody,
  showCode: boolean,
  retryAfterSec?: number,
): IssueEmailCodeResult {
  if (!showCode) {
    const rest = { ...body };
    delete rest.devCode;
    return { status, body: rest, retryAfterSec };
  }
  return { status, body, retryAfterSec };
}

export async function issueEmailCode(input: IssueEmailCodeInput): Promise<IssueEmailCodeResult> {
  const showCode = !input.hosted && !input.hasEmailProvider;
  if (!input.secret) {
    return result(503, { ok: false, error: "Auth is not configured." }, false);
  }

  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  const ipLimit = await input.limiter.hit(
    rateLimitKey("ip", `code:${input.ip || "unknown"}`),
    EMAIL_CODE_IP_LIMIT,
    EMAIL_CODE_TTL_MS,
    now,
  );
  if (!ipLimit.ok) {
    return result(
      429,
      { ok: false, error: "Too many sign-in requests. Wait a few minutes and try again." },
      false,
      ipLimit.retryAfterSec,
    );
  }
  if (!EMAIL_RE.test(email)) {
    return result(400, { ok: false, error: "Enter a valid email address." }, false);
  }
  const emailLimit = await input.limiter.hit(
    rateLimitKey("email", `code:${email}`),
    EMAIL_CODE_LIMIT,
    EMAIL_CODE_TTL_MS,
    now,
  );
  if (!emailLimit.ok) {
    return result(
      429,
      { ok: false, error: "Too many sign-in requests. Wait a few minutes and try again." },
      false,
      emailLimit.retryAfterSec,
    );
  }
  if (!input.allowed) {
    return result(403, { ok: false, error: "Beta invite required. Enter your code at /beta first." }, false);
  }
  if (input.hosted && (!input.hasEmailProvider || input.durableTokens === false)) {
    return result(
      503,
      {
        ok: false,
        error: input.hasEmailProvider
          ? "Email sign-in is unavailable right now."
          : "Email sign-in is unavailable until outgoing mail is configured.",
      },
      false,
    );
  }

  const code = generateEmailCode(input.random);
  await input.store.save({
    email,
    codeHash: emailCodeHash(email, code, input.secret),
    expiresAt: now + EMAIL_CODE_TTL_MS,
    attempts: 0,
  });

  if (!input.hasEmailProvider) {
    return result(200, { ok: true, emailed: false, devCode: code }, showCode);
  }

  let emailed = false;
  try {
    emailed = await input.sendEmail(email, code);
  } catch {
    emailed = false;
  }
  if (!emailed) {
    return result(502, { ok: false, error: "We could not email a sign-in code. Try again in a moment." }, false);
  }
  return result(200, { ok: true, emailed: true }, false);
}

export async function verifyEmailCode(input: {
  email: string;
  code: string;
  secret: string | undefined;
  store: EmailCodeStore;
  now?: number;
}): Promise<{ status: number; body: { ok: boolean; error?: string; token?: string } }> {
  if (!input.secret) return { status: 503, body: { ok: false, error: "Auth is not configured." } };
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return { status: 400, body: { ok: false, error: "Enter the 6-digit code from your email." } };
  }
  const now = input.now ?? Date.now();
  const outcome = await input.store.take(email, emailCodeHash(email, code, input.secret), now, EMAIL_CODE_MAX_ATTEMPTS);
  if (outcome === "locked") {
    return { status: 429, body: { ok: false, error: "Too many attempts. Request a new code." } };
  }
  if (outcome !== "ok") {
    return { status: 401, body: { ok: false, error: "That code is incorrect or expired." } };
  }
  return {
    status: 200,
    body: { ok: true, token: createMagicToken(email, input.secret, now, EMAIL_CODE_EXCHANGE_TTL_MS) },
  };
}
