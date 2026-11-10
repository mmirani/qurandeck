import { unstable_cache } from "next/cache";
import { ALQURAN_API, QURAN_COM_API } from "./sources";

/** Granular scopes for a new Backend app. The legacy `content` scope is not requested. */
export const QF_CONTENT_SCOPES = [
  "content.quran.read",
  "content.translations.read",
  "content.tafsirs.read",
  "content.audio.read",
  "content.metadata.read",
].join(" ");

export const QF_USER_AGENT = "QuranDeck/0.1 (+https://qurandeck.com)";

/** One day fresh, two days stale. Together they stay under Quran Foundation's one-week cache limit. */
export const QURAN_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=172800";

export const QF_REVALIDATE_SECONDS = 86400;
const TOKEN_SKEW_MS = 5 * 60 * 1000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;

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

export function cacheWindowSeconds(header = QURAN_CACHE_CONTROL) {
  const fresh = Number(/s-maxage=(\d+)/.exec(header)?.[1] ?? 0);
  const stale = Number(/stale-while-revalidate=(\d+)/.exec(header)?.[1] ?? 0);
  return { fresh, stale, total: fresh + stale, withinWeek: fresh + stale < WEEK_SECONDS };
}

type CachedToken = { accessToken: string; expiresAt: number };
type Inflight = { generation: number; promise: Promise<CachedToken> };

let cachedToken: CachedToken | null = null;
let inflight: Inflight | null = null;
let generation = 0;

export function resetQfTokenCache() {
  cachedToken = null;
  inflight = null;
  generation += 1;
}

async function requestToken(config: QfConfig): Promise<CachedToken> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: QF_CONTENT_SCOPES,
  });
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch(`${qfAuthBase(config.env)}/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": QF_USER_AGENT,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Quran Foundation token request failed (${response.status})`);
  }
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Quran Foundation token response had no access token");
  return {
    accessToken: payload.access_token,
    expiresAt: tokenExpiresAt(Number(payload.expires_in), Date.now()),
  };
}

export async function getQfAccessToken(force = false): Promise<string> {
  const config = qfConfigFrom();
  if (!config) throw new Error("Quran Foundation credentials are not set");
  if (force) {
    cachedToken = null;
    generation += 1;
  }
  if (cachedToken && tokenIsFresh(cachedToken.expiresAt, Date.now())) return cachedToken.accessToken;
  const gen = generation;
  if (!inflight || inflight.generation !== gen) {
    const promise = requestToken(config);
    inflight = { generation: gen, promise };
    promise.finally(() => {
      if (inflight?.generation === gen) inflight = null;
    });
  }
  const next = await inflight.promise;
  if (generation === gen) cachedToken = next;
  return next.accessToken;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publicJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": QF_USER_AGENT },
    next: { revalidate: QF_REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`Request failed ${response.status}`);
  return response.json() as Promise<T>;
}

async function authorizedJson(url: string, forceToken: boolean): Promise<Response> {
  const config = qfConfigFrom();
  if (!config) throw new Error("Quran Foundation credentials are not set");
  const accessToken = await getQfAccessToken(forceToken);
  return fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-auth-token": accessToken,
      "x-client-id": config.clientId,
      "User-Agent": QF_USER_AGENT,
    },
  });
}

async function loadFoundation(url: string): Promise<unknown> {
  let response = await authorizedJson(url, false);
  if (response.status === 401) response = await authorizedJson(url, true);
  if (response.status === 429 || response.status >= 500) {
    for (let attempt = 0; attempt < 3 && (response.status === 429 || response.status >= 500); attempt += 1) {
      await sleep(backoffDelayMs(attempt));
      response = await authorizedJson(url, false);
    }
  }
  const config = qfConfigFrom();
  if (response.status === 404 && config?.env === "prelive") {
    const fallback = url.replace(qfApiBase("prelive"), QURAN_COM_API);
    return publicJson(fallback);
  }
  if (!response.ok) throw new Error(`Request failed ${response.status}`);
  return response.json();
}

const readFoundation = unstable_cache(loadFoundation, ["qf-content-v1"], {
  revalidate: QF_REVALIDATE_SECONDS,
});

export async function fetchAlQuran<T>(url: string): Promise<T> {
  let status = 0;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(backoffDelayMs(attempt - 1));
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": QF_USER_AGENT },
      next: { revalidate: QF_REVALIDATE_SECONDS },
    });
    if (response.status === 429 || response.status >= 500) {
      status = response.status;
      continue;
    }
    if (!response.ok) throw new Error(`Request failed ${response.status}`);
    return response.json() as Promise<T>;
  }
  throw new Error(`AlQuran Cloud unavailable (${status || "no response"})`);
}

export async function fetchQuranJson<T>(url: string): Promise<T> {
  if (url.startsWith(ALQURAN_API)) return fetchAlQuran<T>(url);
  if (!url.startsWith(QURAN_COM_API)) return publicJson<T>(url);
  const config = qfConfigFrom();
  if (!config) return publicJson<T>(url);
  const qfUrl = url.replace(QURAN_COM_API, qfApiBase(config.env));
  return readFoundation(qfUrl) as Promise<T>;
}
