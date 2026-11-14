import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { UsageStatsView } from "@/components/admin/usage-stats";
import { countUnreadFeedback } from "@/lib/feedback-store";
import { loadGeoSnapshot } from "@/lib/geo-store";
import { parseGeoDir, parseGeoRange, parseGeoSort, summarizeGeo } from "@/lib/geo";
import { adminStatsStatus } from "@/lib/usage";
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

  const [stats, geo, inboxUnread] = await Promise.all([
    loadUsageStats().then(
      (value) => value,
      () => {
        console.error("Usage stats failed");
        return null;
      },
    ),
    loadGeoSnapshot()
      .then((snapshot) => summarizeGeo(snapshot, range, sort, dir))
      .catch(() => {
        console.error("Country stats failed");
        return null;
      }),
    countUnreadFeedback().then(
      (value) => value,
      () => {
        console.error("Feedback unread count failed");
        return null;
      },
    ),
  ]);
  return <UsageStatsView stats={stats} geo={geo} inboxUnread={inboxUnread} />;
}
