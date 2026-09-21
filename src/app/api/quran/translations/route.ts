import { NextResponse } from "next/server";
import { fetchTranslations } from "@/lib/quran/server";

export async function GET() {
  try {
    const translations = await fetchTranslations();
    return NextResponse.json(translations, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load translations";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
