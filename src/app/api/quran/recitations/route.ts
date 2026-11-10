import { QURAN_CACHE_CONTROL } from "@/lib/quran/qf";
import { NextResponse } from "next/server";
import { fetchRecitations } from "@/lib/quran/server";

export async function GET() {
  try {
    const recitations = await fetchRecitations();
    return NextResponse.json(recitations, {
      headers: { "Cache-Control": QURAN_CACHE_CONTROL },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recitations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
