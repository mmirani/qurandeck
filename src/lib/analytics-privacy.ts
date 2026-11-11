const AUTH_API = /^\/api\/auth(?:\/|$)/;

function pageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function isAuthApi(pathname: string) {
  return AUTH_API.test(pathname);
}

/** Drop auth API and callback URLs. Strip every query and hash so tokens never leave the browser. */
export function redactAnalyticsUrl<T extends { url: string }>(event: T): T | null {
  const url = pageUrl(event.url);
  if (!url) return null;
  if (isAuthApi(url.pathname)) return null;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

export function redactSpeedInsight<T extends { url: string; route?: string }>(event: T): T | null {
  const redacted = redactAnalyticsUrl(event);
  if (!redacted) return null;
  if (!event.route) return redacted;
  const route = event.route.split(/[?#]/)[0] ?? "";
  const path = route.startsWith("/") ? route : `/${route}`;
  if (isAuthApi(path)) return null;
  return { ...redacted, route: path };
}
