import { emailFromAddress, hasEmailProvider, isHosted, clientIp } from "@/lib/email-sign-in";
import { getEmailCodeStore } from "@/lib/email-code-store";
import { issueEmailCode } from "@/lib/email-code";
import { getRateLimiter } from "@/lib/rate-limit";
import { emailSignInAllowed } from "@/lib/signup-gate";
import type { AuthReason } from "@/lib/usage";
import { recordAuthFailed, recordAuthRequested } from "@/lib/usage-store";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function sendCode(to: string, code: string) {
  const key = process.env.AUTH_RESEND_KEY?.trim();
  const from = emailFromAddress(process.env);
  if (!key || !from || !/^\d{6}$/.test(code)) return false;
  const safeCode = escapeHtml(code);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your QuranDeck sign-in code",
      html: `<p>Your sign-in code is <strong>${safeCode}</strong>.</p><p>It expires in 10 minutes and works once. If you did not ask for this, you can ignore the email.</p>`,
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

  const store = getEmailCodeStore();
  if (!store) {
    return Response.json(
      { ok: false, error: "Email sign-in is unavailable right now." },
      { status: 503 },
    );
  }

  const normalized = email.trim().toLowerCase();
  let allowed = false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    allowed = await emailSignInAllowed(normalized);
  }

  try {
    const issued = await issueEmailCode({
      email,
      ip: clientIp(request),
      allowed,
      secret: process.env.AUTH_SECRET,
      hosted: isHosted(process.env),
      hasEmailProvider: hasEmailProvider(process.env),
      durableTokens: Boolean(process.env.DATABASE_URL),
      limiter: getRateLimiter(),
      store,
      sendEmail: sendCode,
    });
    const response = Response.json(issued.body, { status: issued.status });
    if (issued.retryAfterSec) response.headers.set("Retry-After", String(issued.retryAfterSec));
    const reason: AuthReason | null =
      issued.status === 200
        ? null
        : issued.status === 502
          ? "send_failed"
          : issued.status === 429
            ? "rate_limited"
            : issued.status === 403
              ? "not_allowed"
              : issued.status === 503
                ? "unavailable"
                : null;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      try {
        if (issued.status === 200) await recordAuthRequested(normalized, "email_code");
        else if (reason) await recordAuthFailed(normalized, "email_code", reason);
      } catch {
        console.error("Usage email request event failed");
      }
    }
    return response;
  } catch {
    console.error("Email code request failed");
    return Response.json({ ok: false, error: "Could not send a sign-in code." }, { status: 503 });
  }
}
