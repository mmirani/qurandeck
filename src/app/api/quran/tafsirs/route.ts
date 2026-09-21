import { NextResponse } from "next/server";
import { fetchTafsirs } from "@/lib/quran/server";

export async function GET() {
  try {
    const tafsirs = await fetchTafsirs();
    return NextResponse.json(tafsirs, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tafsirs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
