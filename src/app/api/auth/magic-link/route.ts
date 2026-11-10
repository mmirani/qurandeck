import {
  clientIp,
  emailFromAddress,
  hasEmailProvider,
  isHosted,
  issueMagicLink,
} from "@/lib/email-sign-in";
import { getRateLimiter } from "@/lib/rate-limit";
import { emailSignInAllowed } from "@/lib/signup-gate";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendWithResend(to: string, url: string) {
  const key = process.env.AUTH_RESEND_KEY?.trim();
  const from = emailFromAddress(process.env);
  if (!key || !from) return false;

  const href = escapeHtml(url);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your QuranDeck sign-in link",
      html: `<p>Tap to sign in. This link expires in 15 minutes and works once.</p><p><a href="${href}">Sign in to QuranDeck</a></p><p>If you did not ask for this, you can ignore the email.</p>`,
    }),
  });

  return response.ok;
}

export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  let allowed = false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    allowed = await emailSignInAllowed(normalized);
  }

  try {
    const issued = await issueMagicLink({
      email,
      ip: clientIp(request),
      allowed,
      secret: process.env.AUTH_SECRET,
      hosted: isHosted(process.env),
      hasEmailProvider: hasEmailProvider(process.env),
      durableTokens: Boolean(process.env.DATABASE_URL),
      limiter: getRateLimiter(),
      sendEmail: sendWithResend,
    });

    const response = Response.json(issued.body, { status: issued.status });
    if (issued.retryAfterSec) {
      response.headers.set("Retry-After", String(issued.retryAfterSec));
    }
    return response;
  } catch {
    console.error("Magic-link request failed");
    return Response.json({ ok: false, error: "Could not create a sign-in link." }, { status: 503 });
  }
}
