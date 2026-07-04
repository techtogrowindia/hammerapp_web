import { signOut } from "@/auth";
import { LogOut } from "lucide-react";

export function Topbar({ name, email }: { name?: string | null; email?: string | null }) {
  const initial = (name ?? email ?? "A").charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-semibold text-sm">
            {initial}
          </div>
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-800">{name ?? "Admin"}</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
