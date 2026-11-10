import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { MagicLinkStore } from "@/lib/magic-link-store";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

type TokenPayload = {
  email: string;
  exp: number;
  jti: string;
};

function baseUrl() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3310";
}

export function magicLinkUrl(token: string, base = baseUrl()) {
  const root = base.replace(/\/$/, "");
  return `${root}/auth/magic?token=${encodeURIComponent(token)}`;
}

export function createMagicToken(email: string, secret: string, now = Date.now(), ttlMs = MAGIC_LINK_TTL_MS) {
  const payload: TokenPayload = {
    email: email.trim().toLowerCase(),
    exp: now + ttlMs,
    jti: randomBytes(16).toString("base64url"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function readPayload(token: string, secret: string, now: number): TokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Partial<TokenPayload>;
  if (typeof record.email !== "string" || !record.email.includes("@")) return null;
  if (typeof record.exp !== "number" || !Number.isFinite(record.exp) || now >= record.exp) return null;
  if (typeof record.jti !== "string" || record.jti.length < 16) return null;
  return { email: record.email, exp: record.exp, jti: record.jti };
}

export async function verifyMagicToken(
  token: string,
  secret: string,
  store: MagicLinkStore,
  now = Date.now(),
): Promise<string | null> {
  const payload = readPayload(token, secret, now);
  if (!payload) return null;
  const fresh = await store.consume({ jti: payload.jti, expiresAt: payload.exp });
  if (!fresh) return null;
  return payload.email;
}
