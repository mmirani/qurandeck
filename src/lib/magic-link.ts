import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 15 * 60 * 1000;

function baseUrl() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3310";
}

export function magicLinkUrl(token: string) {
  return `${baseUrl()}/auth/magic?token=${encodeURIComponent(token)}`;
}

export function createMagicToken(email: string, secret: string) {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + TTL_MS;
  const payload = `${normalized}:${exp}`;
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyMagicToken(token: string, secret: string): string | null {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const sep = payload.lastIndexOf(":");
  if (sep <= 0) return null;
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
  return email;
}
