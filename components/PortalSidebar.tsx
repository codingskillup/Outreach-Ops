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

export default function PortalSidebar() {
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
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <aside className="w-[250px] h-screen fixed left-0 top-0 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between z-50 text-slate-200 select-none">
      {/* Top Header / Branding */}
      <div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900/60 transition-colors group mb-5"
        >
          {/* Logo Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-white">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors truncate">
                Outreach Ops
              </span>
              <Sparkles className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Cold Email Monitor
            </div>
          </div>
        </Link>

        {/* Navigation Groups */}
        <nav className="space-y-5 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 -mr-1">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        active
                          ? "bg-indigo-600/15 text-white border border-indigo-500/30 shadow-sm"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500" />
                      )}

                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active
                            ? "text-indigo-400"
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
      </div>

      {/* Bottom Footer (User & Logout) */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        {/* Workspace Health Indicator */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pipeline Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v2.4</span>
        </div>

        {/* User Profile & Sign Out Bar */}
        <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 pr-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-700 to-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {userEmail ? userEmail.split("@")[0] : "Operations User"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Workspace Admin
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of Outreach Ops"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}