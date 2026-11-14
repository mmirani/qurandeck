import { quranCacheHeaders } from "@/lib/quran/http-cache";
import { NextResponse } from "next/server";
import { fetchJuzs } from "@/lib/quran/server";

export async function GET() {
  try {
    const juzs = await fetchJuzs();
    return NextResponse.json(juzs, {
      headers: quranCacheHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load juzs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
