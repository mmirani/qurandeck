/**
 * /api/quran is a same-origin helper for this app. A missing Origin is allowed
 * so a same-server check (curl, the app's own server) still works. A browser
 * on another site sends Sec-Fetch-Site: cross-site or a foreign Origin.
 * www and the apex match. A *.vercel.app preview must match the request host
 * exactly, because vercel.app is one registrable domain.
 */
export function quranRequestAllowed(input: {
  host: string;
  origin: string | null;
  referer: string | null;
  secFetchSite: string | null;
}): boolean {
  const site = input.secFetchSite?.trim().toLowerCase() ?? "";
  if (site === "cross-site") return false;

  const host = hostnameOfHeader(input.host);
  if (!host) return false;

  const originHost = input.origin ? hostnameOfUrl(input.origin) : null;
  if (input.origin && !originHost) return false;
  if (originHost && !hostsMatch(host, originHost)) return false;

  if (!originHost) {
    const refererHost = input.referer ? hostnameOfUrl(input.referer) : null;
    if (input.referer && !refererHost) return false;
    if (refererHost && !hostsMatch(host, refererHost)) return false;
  }

  if (site === "same-site" && !originHost) return false;
  return true;
}

export function hostsMatch(requestHost: string, otherHost: string) {
  if (!requestHost || !otherHost) return false;
  if (requestHost === otherHost) return true;
  const apex = (host: string) => host.replace(/^www\./, "");
  return apex(requestHost) === "qurandeck.com" && apex(otherHost) === "qurandeck.com";
}

function hostnameOfHeader(value: string) {
  return value.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

function hostnameOfUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}
