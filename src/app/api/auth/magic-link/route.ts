import { cookies } from "next/headers";
import { BETA_COOKIE } from "@/auth";
import { createMagicToken, magicLinkUrl } from "@/lib/magic-link";

async function canRequest(email: string) {
  if (process.env.AUTH_PUBLIC_SIGNUP === "true") return true;

  const allowlist =
    process.env.BETA_ALLOWED_EMAILS?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (allowlist.includes(email.toLowerCase())) return true;

  const store = await cookies();
  return store.get(BETA_COOKIE)?.value === "1";
}

async function sendWithResend(to: string, url: string) {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) return false;

  const from = process.env.AUTH_EMAIL_FROM ?? "QuranDeck <onboarding@resend.dev>";
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
      html: `<p>Tap to sign in (link expires in 15 minutes):</p><p><a href="${url}">Sign in to QuranDeck</a></p>`,
    }),
  });

  return response.ok;
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "Auth is not configured." }, { status: 503 });
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase() ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  if (!(await canRequest(email))) {
    return Response.json(
      { ok: false, error: "Beta invite required. Enter your code at /beta first." },
      { status: 403 },
    );
  }

  const token = createMagicToken(email, secret);
  const url = magicLinkUrl(token);
  const emailed = await sendWithResend(email, url);

  return Response.json({
    ok: true,
    emailed,
    url: emailed ? undefined : url,
  });
}
