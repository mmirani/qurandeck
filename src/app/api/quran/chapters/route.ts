import { quranCacheHeaders } from "@/lib/quran/http-cache";
import { NextResponse } from "next/server";
import { fetchChapters } from "@/lib/quran/server";

export async function GET() {
  try {
    const chapters = await fetchChapters();
    return NextResponse.json(chapters, {
      headers: quranCacheHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chapters";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
