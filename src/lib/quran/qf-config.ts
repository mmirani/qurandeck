import { QURAN_COM_API } from "./sources";

/** Granular scopes for a new Backend app. The legacy `content` scope is not requested. */
export const QF_CONTENT_SCOPES = [
  "content.quran.read",
  "content.translations.read",
  "content.tafsirs.read",
  "content.audio.read",
  "content.metadata.read",
].join(" ");

export const QF_USER_AGENT = "QuranDeck/0.1 (+https://qurandeck.com)";

const TOKEN_SKEW_MS = 5 * 60 * 1000;

export type QfEnv = "prelive" | "production";

export type QfConfig = {
  clientId: string;
  clientSecret: string;
  env: QfEnv;
};

export function qfConfigFrom(env: Record<string, string | undefined> = process.env): QfConfig | null {
  const clientId = env.QF_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.QF_CLIENT_SECRET?.trim() ?? "";
  const name = env.QF_ENV?.trim();
  if (!clientId || !clientSecret) return null;
  if (name !== "prelive" && name !== "production") return null;
  return { clientId, clientSecret, env: name };
}

export function qfAuthBase(env: QfEnv) {
  return env === "prelive" ? "https://prelive-oauth2.quran.foundation" : "https://oauth2.quran.foundation";
}

export function qfApiBase(env: QfEnv) {
  return env === "prelive"
    ? "https://apis-prelive.quran.foundation/content/api/v4"
    : "https://apis.quran.foundation/content/api/v4";
}

export function foundationUrl(pathAndQuery: string, config = qfConfigFrom()) {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const base = config ? qfApiBase(config.env) : QURAN_COM_API;
  return `${base}${path}`;
}

export function tokenExpiresAt(expiresInSeconds: number, now: number) {
  const seconds = Number.isFinite(expiresInSeconds) && expiresInSeconds > 60 ? expiresInSeconds : 3600;
  return now + seconds * 1000;
}

export function tokenIsFresh(expiresAt: number, now: number, skewMs = TOKEN_SKEW_MS) {
  return now < expiresAt - skewMs;
}

export function backoffDelayMs(attempt: number, jitter = 0.5) {
  const clamped = Math.min(1, Math.max(0, jitter));
  const base = Math.min(4000, 300 * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.5 + clamped * 0.5));
}
