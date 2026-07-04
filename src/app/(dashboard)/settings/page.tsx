import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rows = await prisma.setting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
  return <SettingsForm settings={settings} />;
}
