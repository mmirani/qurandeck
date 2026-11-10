import { QURAN_CACHE_CONTROL } from "@/lib/quran/qf";
import { NextResponse } from "next/server";
import { fetchJuzs } from "@/lib/quran/server";

export async function GET() {
  try {
    const juzs = await fetchJuzs();
    return NextResponse.json(juzs, {
      headers: { "Cache-Control": QURAN_CACHE_CONTROL },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load juzs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
