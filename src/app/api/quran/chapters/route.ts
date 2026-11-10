import { QURAN_CACHE_CONTROL } from "@/lib/quran/qf";
import { NextResponse } from "next/server";
import { fetchChapters } from "@/lib/quran/server";

export async function GET() {
  try {
    const chapters = await fetchChapters();
    return NextResponse.json(chapters, {
      headers: { "Cache-Control": QURAN_CACHE_CONTROL },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chapters";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
