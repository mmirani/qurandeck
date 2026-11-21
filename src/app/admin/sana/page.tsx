import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SanaMissedView } from "@/components/admin/sana-missed";
import { loadTopMissed } from "@/lib/sana-missed-store";
import { adminStatsStatus } from "@/lib/usage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sana missed",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminSanaPage() {
  let email: string | null = null;
  try {
    const session = await auth();
    email = session?.user?.email ?? null;
  } catch {
    console.error("Admin Sana sign-in check failed");
    notFound();
  }
  if (adminStatsStatus(email) === 404) notFound();

  const rows = await loadTopMissed().catch(() => {
    console.error("Sana missed shapes failed");
    return null;
  });
  return <SanaMissedView rows={rows} />;
}
