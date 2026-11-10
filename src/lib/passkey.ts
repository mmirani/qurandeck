const ALLOWED_HOSTS = new Set(["localhost", "qurandeck.vercel.app", "qurandeck.com", "www.qurandeck.com"]);

export function passkeyRequestContext(request: Request, authUrl?: string) {
  const header = request.headers.get("origin");
  let originUrl: URL;
  try {
    originUrl = new URL(header || request.url);
  } catch {
    return null;
  }
  const host = originUrl.hostname;
  let configured: string | null = null;
  if (authUrl) {
    try {
      configured = new URL(authUrl).hostname;
    } catch {
      configured = null;
    }
  }
  if (host !== "localhost" && !ALLOWED_HOSTS.has(host) && host !== configured) return null;
  if (originUrl.protocol !== "https:" && !(host === "localhost" && originUrl.protocol === "http:")) return null;
  return { origin: originUrl.origin, rpID: host };
}

export function bytesToBase64url(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

export function base64urlToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
