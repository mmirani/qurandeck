import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TAFSIR_ID } from "@/lib/quran/sources";
import { fetchTafsirByAyah } from "@/lib/quran/server";

export async function GET(request: NextRequest) {
  const verse = request.nextUrl.searchParams.get("verse") ?? "";
  if (!/^\d{1,3}:\d{1,3}$/.test(verse)) {
    return NextResponse.json({ error: "Verse key must look like 2:255" }, { status: 400 });
  }
  const id = Number(request.nextUrl.searchParams.get("id") ?? DEFAULT_TAFSIR_ID);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Tafsir id is invalid" }, { status: 400 });
  }

  try {
    const passage = await fetchTafsirByAyah(id, verse);
    return NextResponse.json(passage, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tafsir";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
