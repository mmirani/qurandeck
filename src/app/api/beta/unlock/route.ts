import { BETA_COOKIE } from "@/auth";

export async function POST(request: Request) {
  const secret = process.env.BETA_INVITE_SECRET?.trim();
  if (!secret) {
    return Response.json({ ok: false, error: "Beta invites are not configured." }, { status: 503 });
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = body.code?.trim() ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (code !== secret) {
    return Response.json({ ok: false, error: "That invite code is not valid." }, { status: 403 });
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${BETA_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90};${
      process.env.NODE_ENV === "production" ? " Secure;" : ""
    }`,
  );
  return response;
}
