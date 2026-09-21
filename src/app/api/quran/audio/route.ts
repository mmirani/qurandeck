import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_RECITATION_ID } from "@/lib/quran/sources";
import { fetchAudioMap } from "@/lib/quran/server";

export async function GET(request: NextRequest) {
  const recitation = Number(request.nextUrl.searchParams.get("recitation") ?? DEFAULT_RECITATION_ID);
  const chapter = Number(request.nextUrl.searchParams.get("chapter") ?? 1);

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 114) {
    return NextResponse.json({ error: "Chapter must be 1–114" }, { status: 400 });
  }

  try {
    const audio = await fetchAudioMap(recitation, chapter);
    return NextResponse.json(audio, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audio";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
