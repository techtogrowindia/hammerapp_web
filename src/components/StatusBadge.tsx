import { cn } from "@/lib/cn";

// Maps KYC / account statuses to badge colors (claude.md §7 design theme).
const STATUS_STYLES: Record<string, string> = {
  // KYC
  VERIFIED: "bg-green-100 text-green-700",
  PENDING: "bg-orange-100 text-orange-700",
  NEED_CLARIFICATION: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  NOT_COMPLETED: "bg-slate-100 text-slate-600",
  NOT_STARTED: "bg-slate-100 text-slate-500",
  // Account
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  TERMINATED: "bg-red-100 text-red-700",
};

const LABELS: Record<string, string> = {
  NEED_CLARIFICATION: "Clarification",
  NOT_COMPLETED: "Incomplete",
  NOT_STARTED: "Not started",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const label =
    LABELS[status] ??
    status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
      )}
    >
      {label}
    </span>
  );
}
