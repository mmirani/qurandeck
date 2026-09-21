import { NextRequest, NextResponse } from "next/server";
import { parseTranslationQuery } from "@/lib/quran/languages";
import { fetchVersesByJuz } from "@/lib/quran/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const juzNumber = Number(id);
  if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    return NextResponse.json({ error: "Juz must be 1–30" }, { status: 400 });
  }

  const translation = parseTranslationQuery(request.nextUrl.searchParams.get("translation"));

  try {
    const verses = await fetchVersesByJuz(juzNumber, translation);
    return NextResponse.json(
      { juz: juzNumber, verses },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load juz";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
