import { NextResponse } from "next/server";
import { fetchJuzs } from "@/lib/quran/server";

export async function GET() {
  try {
    const juzs = await fetchJuzs();
    return NextResponse.json(juzs, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load juzs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
