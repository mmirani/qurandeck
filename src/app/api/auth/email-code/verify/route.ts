import { getEmailCodeStore } from "@/lib/email-code-store";
import { verifyEmailCode } from "@/lib/email-code";
import { clientIp } from "@/lib/email-sign-in";
import { getRateLimiter, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let email = "";
  let code = "";
  try {
    const body = (await request.json()) as { email?: unknown; code?: unknown };
    email = typeof body.email === "string" ? body.email : "";
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const store = getEmailCodeStore();
  if (!store) {
    return Response.json({ ok: false, error: "Email sign-in is unavailable right now." }, { status: 503 });
  }

  const limiter = getRateLimiter();
  const ipLimit = await limiter.hit(rateLimitKey("ip", `code-verify:${clientIp(request)}`), 30, 10 * 60 * 1000);
  if (!ipLimit.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
    );
  }

  try {
    const result = await verifyEmailCode({
      email,
      code,
      secret: process.env.AUTH_SECRET,
      store,
    });
    return Response.json(result.body, { status: result.status });
  } catch {
    console.error("Email code verification failed");
    return Response.json({ ok: false, error: "Could not check that code." }, { status: 503 });
  }
}
