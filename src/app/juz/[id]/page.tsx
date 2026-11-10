import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { parseJuzId } from "@/lib/quran/ids";

export default async function JuzPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!parseJuzId(id)) notFound();
  return <AppShell />;
}
