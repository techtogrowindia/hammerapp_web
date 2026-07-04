import { Construction } from "lucide-react";

// Placeholder for navigation items not yet built (Shops, Users, Manage,
// Push, Team, Settings). Specific routes like /technicians take priority.
export default async function ComingSoon({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const title = slug
    .join(" / ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-2xl bg-orange-100 text-[var(--accent)] flex items-center justify-center mb-4">
        <Construction className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        This section is coming soon as part of the phased rollout.
      </p>
    </div>
  );
}
