import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const s = await getSettings(["site.logo"]);
  const logoPath = s["site.logo"];
  const logoUrl = logoPath ? `/uploads/${logoPath.replace(/^\/+/, "")}` : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar logo={logoUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar name={session.user.name} email={session.user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
