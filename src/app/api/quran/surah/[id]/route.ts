import { NextRequest, NextResponse } from "next/server";
import { parseTranslationQuery } from "@/lib/quran/languages";
import { DEFAULT_RECITATION_ID } from "@/lib/quran/sources";
import { fetchChapter, fetchChapterInfo, fetchVersesByChapter } from "@/lib/quran/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const chapterId = Number(id);
  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
    return NextResponse.json({ error: "Surah must be 1–114" }, { status: 400 });
  }

  const translation = parseTranslationQuery(request.nextUrl.searchParams.get("translation"));
  const recitation = Number(request.nextUrl.searchParams.get("recitation") ?? DEFAULT_RECITATION_ID);

  try {
    const [chapter, verses, introduction] = await Promise.all([
      fetchChapter(chapterId),
      fetchVersesByChapter(chapterId, translation, recitation),
      fetchChapterInfo(chapterId),
    ]);
    return NextResponse.json(
      { chapter, verses, introduction },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load surah";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
