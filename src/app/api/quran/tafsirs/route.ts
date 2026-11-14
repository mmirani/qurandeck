import { quranCacheHeaders } from "@/lib/quran/http-cache";
import { NextResponse } from "next/server";
import { fetchTafsirs } from "@/lib/quran/server";

export async function GET() {
  try {
    const tafsirs = await fetchTafsirs();
    return NextResponse.json(tafsirs, {
      headers: quranCacheHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tafsirs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
