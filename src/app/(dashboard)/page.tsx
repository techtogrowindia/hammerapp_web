import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UserCheck, Clock, BadgeCheck, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [total, pending, verified, rejected] = await Promise.all([
    prisma.technician.count(),
    prisma.technician.count({ where: { kycStatus: "PENDING" } }),
    prisma.technician.count({ where: { kycStatus: "VERIFIED" } }),
    prisma.technician.count({ where: { kycStatus: "REJECTED" } }),
  ]);
  return { total, pending, verified, rejected };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Technicians", value: stats.total, icon: UserCheck, color: "text-slate-600 bg-slate-100" },
    { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-orange-600 bg-orange-100" },
    { label: "Verified", value: stats.verified, icon: BadgeCheck, color: "text-green-600 bg-green-100" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-600 bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview of technician onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl border border-[var(--border)] p-5 flex items-center gap-4"
            >
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${c.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <h2 className="font-semibold text-slate-800 mb-2">Quick actions</h2>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link
            href="/technicians"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            Review Technician Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
