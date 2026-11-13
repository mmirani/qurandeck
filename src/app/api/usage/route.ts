import { auth } from "@/auth";
import { recordGeo } from "@/lib/geo-store";
import { clientAddress, getRateLimiter } from "@/lib/rate-limit";
import { USAGE_BODY_LIMIT, acceptUsagePost, parseUsageRequest } from "@/lib/usage";
import { getUsageInserter } from "@/lib/usage-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > USAGE_BODY_LIMIT) {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400, headers: noStore });
  }

  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return Response.json({ ok: false, error: "Invalid request." }, { status: 400, headers: noStore });
    }
  }

  const parsed = parseUsageRequest(body);
  let email: string | null = null;
  if (parsed.ok && (parsed.kind === "guest_merge" || parsed.kind === "batch")) {
    try {
      const session = await auth();
      email = session?.user?.email ?? null;
    } catch {
      email = null;
    }
  }

  const result = await acceptUsagePost({
    body,
    signedInEmail: email,
    ip: clientAddress(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip") ?? "local"),
    limiter: getRateLimiter(),
    store: getUsageInserter(),
    countryHeader: request.headers.get("x-vercel-ip-country"),
    recordGeo,
  });

  return Response.json(result.body, {
    status: result.status,
    headers: { ...noStore, ...result.headers },
  });
}
