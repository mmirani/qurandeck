import "server-only";
import { unstable_cache } from "next/cache";
import { QF_REVALIDATE_SECONDS } from "./http-cache";
import {
  QF_CONTENT_SCOPES,
  QF_USER_AGENT,
  type QfConfig,
  backoffDelayMs,
  qfApiBase,
  qfAuthBase,
  qfConfigFrom,
  tokenExpiresAt,
  tokenIsFresh,
} from "./qf-config";
import { ALQURAN_API, QURAN_COM_API } from "./sources";

export { QURAN_CACHE_CONTROL, QF_REVALIDATE_SECONDS, cacheWindowSeconds, quranCacheHeaders } from "./http-cache";
export {
  QF_CONTENT_SCOPES,
  QF_USER_AGENT,
  backoffDelayMs,
  foundationUrl,
  qfApiBase,
  qfAuthBase,
  qfConfigFrom,
  tokenExpiresAt,
  tokenIsFresh,
} from "./qf-config";
export type { QfConfig, QfEnv } from "./qf-config";

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
  throw new Error(`Request failed ${status || "no response"}`);
}

async function authorizedJson(url: string, forceToken: boolean): Promise<Response> {
  const config = qfConfigFrom();
  if (!config) throw new Error("Quran Foundation credentials are not set");
  const accessToken = await getQfAccessToken(forceToken);
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "x-auth-token": accessToken,
      "x-client-id": config.clientId,
      "User-Agent": QF_USER_AGENT,
    },
    next: { revalidate: QF_REVALIDATE_SECONDS },
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
