import { AppShell } from "@/components/shell/app-shell";

export default async function SurahPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <AppShell />;
}
