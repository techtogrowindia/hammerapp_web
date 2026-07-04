import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, ChevronRight, Store } from "lucide-react";
import type { KycStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const KYC_FILTERS: (KycStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "NEED_CLARIFICATION",
  "VERIFIED",
  "REJECTED",
  "NOT_STARTED",
];

interface SearchParams {
  q?: string;
  status?: string;
}

export default async function ShopsOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, status } = await searchParams;

  const where: Prisma.ShopWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status && status !== "ALL") {
    where.kycStatus = status as KycStatus;
  }

  const shops = await prisma.shop.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { personalKyc: { select: { name: true, firmType: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shop Onboarding</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and verify shop (retailer) KYC submissions.
          </p>
        </div>
        <Link
          href="/shops-onboarding/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
        >
          <Store className="h-4 w-4" />
          Add Shop
        </Link>
      </div>

      <form className="flex flex-col sm:flex-row gap-3" method="GET">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, mobile, or ID..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? "ALL"}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
        >
          {KYC_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "ALL" ? "All statuses" : f.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Filter
        </button>
      </form>

      <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Firm Type</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">KYC Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {shops.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No shops found.
                  </td>
                </tr>
              )}
              {shops.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.name ?? s.personalKyc?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {s.personalKyc?.firmType ? s.personalKyc.firmType.replace(/_/g, " ").toLowerCase() : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.mobile}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={s.kycStatus} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/shops-onboarding/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
                    >
                      Review KYC
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
