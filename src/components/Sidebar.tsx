"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  Store,
  Users,
  Wrench,
  Award,
  MapPin,
  Package,
  BadgeCheck,
  XCircle,
  Bell,
  UsersRound,
  Settings,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

// Navigation from claude.md §7. Items without a built page yet still link
// (they render a "coming soon" placeholder) so the IA is visible.
const NAV: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Onboarding",
    items: [
      { label: "Technician Onboarding", href: "/technicians", icon: UserCheck },
      { label: "Shop Onboarding", href: "/shops-onboarding", icon: Store },
    ],
  },
  {
    title: "Users",
    items: [
      { label: "Technician", href: "/users/technicians", icon: Users },
      { label: "Shops", href: "/users/shops", icon: Store },
      { label: "Customer", href: "/users/customers", icon: Users },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Services", href: "/manage/services", icon: Wrench },
      { label: "Certificates", href: "/manage/certificates", icon: Award },
      { label: "Locations", href: "/manage/locations", icon: MapPin },
      { label: "Products", href: "/manage/products", icon: Package },
      { label: "Badge", href: "/manage/badges", icon: BadgeCheck },
      { label: "Reject Reasons", href: "/manage/reject-reasons", icon: XCircle },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Push Notification", href: "/push", icon: Bell },
      { label: "Team", href: "/team", icon: UsersRound },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  logo,
  siteName,
}: {
  logo?: string | null;
  siteName?: string | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-64 shrink-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={siteName ?? "Hammer"} className="h-9 w-9 rounded object-contain shrink-0" />
        ) : (
          <Hammer className="h-6 w-6 text-[var(--accent)] shrink-0" />
        )}
        <span className="text-white font-bold text-base tracking-tight leading-tight">
          {siteName ?? "Hammer App"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-[var(--accent)] text-white font-medium"
                          : "hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
