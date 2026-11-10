import { createMagicToken, MAGIC_LINK_TTL_MS, magicLinkUrl } from "@/lib/magic-link";
import { rateLimitKey, type RateLimiter } from "@/lib/rate-limit";

export const MAGIC_LINK_EMAIL_LIMIT = 5;
export const MAGIC_LINK_IP_LIMIT = 20;
export const MAGIC_LINK_RATE_WINDOW_MS = MAGIC_LINK_TTL_MS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailSignInEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  AUTH_RESEND_KEY?: string;
  AUTH_EMAIL_FROM?: string;
};

export type MagicLinkDelivery = "resend" | "dev-link" | "unavailable";

export function isHosted(env: EmailSignInEnv) {
  return env.NODE_ENV === "production" || Boolean(env.VERCEL_ENV);
}

export function hasEmailProvider(env: EmailSignInEnv) {
  if (!env.AUTH_RESEND_KEY?.trim()) return false;
  if (isHosted(env) && !env.AUTH_EMAIL_FROM?.trim()) return false;
  return true;
}

export function emailFromAddress(env: EmailSignInEnv) {
  const from = env.AUTH_EMAIL_FROM?.trim();
  if (from) return from;
  if (!env.AUTH_RESEND_KEY?.trim() || isHosted(env)) return null;
  return "QuranDeck <onboarding@resend.dev>";
}

/** Local `next dev` may show a link. Production and any Vercel runtime may not. */
export function canShowMagicLinkOnScreen(env: EmailSignInEnv) {
  return !isHosted(env) && !hasEmailProvider(env);
}

export function emailDeliveryMode(env: EmailSignInEnv): MagicLinkDelivery {
  if (hasEmailProvider(env)) return "resend";
  if (canShowMagicLinkOnScreen(env)) return "dev-link";
  return "unavailable";
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  return "unknown";
}

export type IssueMagicLinkInput = {
  email: string;
  ip: string;
  allowed: boolean;
  secret: string | undefined;
  hosted: boolean;
  hasEmailProvider: boolean;
  /** False on a hosted deploy with no database, where a token cannot be consumed once. */
  durableTokens?: boolean;
  limiter: RateLimiter;
  sendEmail: (to: string, url: string) => Promise<boolean>;
  now?: number;
  baseUrl?: string;
};

export type IssueMagicLinkBody = {
  ok: boolean;
  error?: string;
  emailed?: boolean;
  url?: string;
};

export type IssueMagicLinkResult = {
  status: number;
  body: IssueMagicLinkBody;
  retryAfterSec?: number;
};

function result(
  status: number,
  body: IssueMagicLinkBody,
  showLink: boolean,
  retryAfterSec?: number,
): IssueMagicLinkResult {
  if (!showLink) {
    const rest = { ...body };
    delete rest.url;
    return { status, body: rest, retryAfterSec };
  }
  return { status, body, retryAfterSec };
}

export async function issueMagicLink(input: IssueMagicLinkInput): Promise<IssueMagicLinkResult> {
  const showLink = !input.hosted && !input.hasEmailProvider;
  if (!input.secret) {
    return result(503, { ok: false, error: "Auth is not configured." }, false);
  }

  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  const ipLimit = await input.limiter.hit(
    rateLimitKey("ip", input.ip || "unknown"),
    MAGIC_LINK_IP_LIMIT,
    MAGIC_LINK_RATE_WINDOW_MS,
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
    rateLimitKey("email", email),
    MAGIC_LINK_EMAIL_LIMIT,
    MAGIC_LINK_RATE_WINDOW_MS,
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
    return result(
      403,
      { ok: false, error: "Beta invite required. Enter your code at /beta first." },
      false,
    );
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

  const token = createMagicToken(email, input.secret, now);
  const url = magicLinkUrl(token, input.baseUrl);

  if (!input.hasEmailProvider) {
    return result(200, { ok: true, emailed: false, url }, showLink);
  }

  let emailed = false;
  try {
    emailed = await input.sendEmail(email, url);
  } catch {
    emailed = false;
  }

  if (!emailed) {
    return result(
      502,
      { ok: false, error: "We could not email a sign-in link. Try again in a moment." },
      false,
    );
  }

  return result(200, { ok: true, emailed: true }, false);
}
