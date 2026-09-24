import { loadPlatformRanks, prepareReadingRanksStore } from "@/lib/reading-ranks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const surahs = clamp(Number(url.searchParams.get("surahs") ?? 10), 1, 20);
  const ayahs = clamp(Number(url.searchParams.get("ayahs") ?? 10), 1, 20);

  try {
    await prepareReadingRanksStore();
    const ranks = await loadPlatformRanks({ surahs, ayahs });
    return Response.json({
      surahs: ranks.surahs,
      ayahs: ranks.ayahs,
    });
  } catch {
    return Response.json({ error: "Ranks are unavailable." }, { status: 503 });
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
