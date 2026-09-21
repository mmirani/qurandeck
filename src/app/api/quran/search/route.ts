import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TRANSLATION_ID } from "@/lib/quran/sources";
import { searchQuran } from "@/lib/quran/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const translation = Number(request.nextUrl.searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID);

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchQuran(query, translation);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
