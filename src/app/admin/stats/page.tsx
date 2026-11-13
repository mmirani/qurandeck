import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { UsageStatsView } from "@/components/admin/usage-stats";
import { loadGeoSnapshot } from "@/lib/geo-store";
import { parseGeoDir, parseGeoRange, parseGeoSort, summarizeGeo, type GeoSummary } from "@/lib/geo";
import { adminStatsStatus, type UsageStats } from "@/lib/usage";
import { loadUsageStats } from "@/lib/usage-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[]; sort?: string | string[]; dir?: string | string[] }>;
}) {
  const query = await searchParams;
  let email: string | null = null;
  try {
    const session = await auth();
    email = session?.user?.email ?? null;
  } catch {
    console.error("Admin stats sign-in check failed");
    notFound();
  }
  if (adminStatsStatus(email) === 404) notFound();

  const range = parseGeoRange(query.range);
  const sort = parseGeoSort(query.sort);
  const dir = parseGeoDir(query.dir);

  let stats: UsageStats | null = null;
  try {
    stats = await loadUsageStats();
  } catch {
    console.error("Usage stats failed");
  }

  let geo: GeoSummary | null = null;
  try {
    geo = summarizeGeo(await loadGeoSnapshot(), range, sort, dir);
  } catch {
    console.error("Country stats failed");
  }
  return <UsageStatsView stats={stats} geo={geo} />;
}
