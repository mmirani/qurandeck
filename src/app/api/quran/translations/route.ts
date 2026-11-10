import { QURAN_CACHE_CONTROL } from "@/lib/quran/qf";
import { NextResponse } from "next/server";
import { fetchTranslations } from "@/lib/quran/server";

export async function GET() {
  try {
    const translations = await fetchTranslations();
    return NextResponse.json(translations, {
      headers: { "Cache-Control": QURAN_CACHE_CONTROL },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load translations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
