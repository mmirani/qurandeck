import { MISSED_BODY_LIMIT, acceptMissedPost } from "@/lib/sana-missed";
import { getMissedStore } from "@/lib/sana-missed-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Counts one missed Sana command shape for today.
 * Reads only the JSON body. No session, cookie, IP, or user agent is read or stored.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MISSED_BODY_LIMIT) return new Response(null, { status: 400, headers: noStore });
  const result = await acceptMissedPost(raw, getMissedStore());
  return new Response(null, { status: result.status, headers: noStore });
}
