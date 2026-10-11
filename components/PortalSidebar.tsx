"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Mail,
  Megaphone,
  Globe,
  TriangleAlert,
  Activity,
  StickyNote,
  Settings,
  LogOut,
  Zap,
  Sparkles,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type NavGroup = {
  label: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
};

const navigationGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Activity",
        href: "/activity",
        icon: Activity,
      },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      {
        name: "Clients",
        href: "/clients",
        icon: Users,
      },
      {
        name: "Email Accounts",
        href: "/emailaccounts",
        icon: Mail,
      },
      {
        name: "Campaigns",
        href: "/campaigns",
        icon: Megaphone,
      },
      {
        name: "Domains",
        href: "/domains",
        icon: Globe,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        name: "Issues",
        href: "/issues",
        icon: TriangleAlert,
      },
      {
        name: "Notes",
        href: "/notes",
        icon: StickyNote,
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

export default function PortalSidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
  }, [supabase]);

  async function handleLogout() {
    onClose?.();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <aside
      className={`w-[275px] max-w-[85vw] h-[100dvh] max-h-[100dvh] fixed left-0 top-0 bg-[#14243D] border-r border-[#1e3456] flex flex-col z-50 text-slate-200 select-none transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* ── Top Header / Branding (Pinned) ── */}
      <div className="shrink-0 p-4 border-b border-[#1e3456]/70 flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 p-1 rounded-xl hover:bg-[#1b2f4f] transition-colors group flex-1 min-w-0"
        >
          {/* Logo Badge */}
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center text-white">
            <Zap className="w-5 h-5 text-white fill-white/20" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-blue-300 transition-colors truncate">
                Outreach Ops
              </span>
              <Sparkles className="w-3 h-3 text-[#10B981] shrink-0" />
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              Cold Email Monitor
            </div>
          </div>
        </Link>

        {/* Close button for mobile screen */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b2f4f] active:scale-95 transition-all shrink-0 ml-1"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Middle Navigation Groups (Smooth Scrollable Area) ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-4">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400/90">
              {group.label}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 ${
                      active
                        ? "bg-[#2563EB] text-white shadow-sm font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-[#1b2f4f]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />

                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Footer: User Profile & Pinned Logout Button (Always Visible) ── */}
      <div className="shrink-0 p-3 border-t border-[#1e3456] bg-[#0c182b] space-y-2">
        {/* Workspace Health Indicator */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#14243D]/80 border border-[#1e3456] text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-medium">Pipeline Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v2.4</span>
        </div>

        {/* User Profile & Prominent Sign Out Bar */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#14243D]/90 border border-[#1e3456] transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 pr-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {userEmail ? userEmail.split("@")[0] : "Operations User"}
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                Workspace Admin
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of Outreach Ops"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}