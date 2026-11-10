import { QURAN_CACHE_CONTROL } from "@/lib/quran/qf";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TRANSLATION_ID } from "@/lib/quran/sources";
import { searchQuran } from "@/lib/quran/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const translation = Number(request.nextUrl.searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID);
  const language = request.nextUrl.searchParams.get("language") ?? undefined;

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchQuran(query, translation, language);
    return NextResponse.json({ results }, { headers: { "Cache-Control": QURAN_CACHE_CONTROL } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
