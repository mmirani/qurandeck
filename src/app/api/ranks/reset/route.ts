import { timingSafeEqual } from "crypto";
import { resetPlatformRanks } from "@/lib/reading-ranks";

function tokenMatches(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Clears platform “most read” counts. Set RANK_RESET_TOKEN and POST with Authorization: Bearer <token>. */
export async function POST(request: Request) {
  const expected = process.env.RANK_RESET_TOKEN?.trim();
  if (!expected) {
    return Response.json(
      { error: "Rank reset is not configured. Set RANK_RESET_TOKEN before calling this." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!tokenMatches(token, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await resetPlatformRanks();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not reset ranks." }, { status: 503 });
  }
}
