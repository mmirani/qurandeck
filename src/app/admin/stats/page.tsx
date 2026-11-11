import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { UsageStatsView } from "@/components/admin/usage-stats";
import { isAdminEmail, type UsageStats } from "@/lib/usage";
import { loadUsageStats } from "@/lib/usage-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminStatsPage() {
  let email: string | null = null;
  try {
    const session = await auth();
    email = session?.user?.email ?? null;
  } catch {
    console.error("Admin stats sign-in check failed");
    notFound();
  }
  if (!isAdminEmail(email)) notFound();

  let stats: UsageStats | null = null;
  try {
    stats = await loadUsageStats();
  } catch {
    console.error("Usage stats failed");
  }
  return <UsageStatsView stats={stats} />;
}
