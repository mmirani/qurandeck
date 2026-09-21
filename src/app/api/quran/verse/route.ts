import { NextRequest, NextResponse } from "next/server";
import { parseTranslationQuery } from "@/lib/quran/languages";
import { fetchVerseByKey } from "@/lib/quran/server";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!/^\d{1,3}:\d{1,3}$/.test(key)) {
    return NextResponse.json({ error: "Verse key must look like 2:255" }, { status: 400 });
  }
  const translation = parseTranslationQuery(request.nextUrl.searchParams.get("translation"));
  try {
    const verse = await fetchVerseByKey(key, translation);
    return NextResponse.json(verse, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load verse";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
