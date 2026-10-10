"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RefreshCw,
  TriangleAlert,
  Clock,
  ChevronRight,
  Bell,
  Search,
  Plus,
  ShieldCheck,
  Zap,
  Menu,
} from "lucide-react";

type SystemStatus =
  | "loading"
  | "operational"
  | "warning"
  | "critical";

const pageCategories: Record<
  string,
  { title: string; category: string; description?: string }
> = {
  "/dashboard": {
    title: "Executive Dashboard",
    category: "Operations",
    description: "High-level outreach performance and system health",
  },
  "/activity": {
    title: "Audit & Activity Logs",
    category: "Operations",
    description: "Real-time sync logs and system event stream",
  },
  "/clients": {
    title: "Client Accounts",
    category: "Infrastructure",
    description: "Directory of managed client workspaces",
  },
  "/emailaccounts": {
    title: "Sending Inboxes",
    category: "Infrastructure",
    description: "Warmup metrics, deliverability and sending accounts",
  },
  "/campaigns": {
    title: "Active Campaigns",
    category: "Infrastructure",
    description: "Smartlead campaign performance and analytics",
  },
  "/domains": {
    title: "Domain Portfolio",
    category: "Infrastructure",
    description: "DNS authentication, SPF/DKIM/DMARC records",
  },
  "/issues": {
    title: "System Diagnostics & Issues",
    category: "Operations",
    description: "Drift alerts, misconfigurations and auto-fixes",
  },
  "/notes": {
    title: "Notes & Operational Memos",
    category: "Operations",
    description: "Action items, client instructions and reminders",
  },
  "/settings": {
    title: "Integrations & Preferences",
    category: "Management",
    description: "API keys, webhook connections and alert triggers",
  },
  "/connections": {
    title: "Connected Platforms",
    category: "Management",
    description: "Smartlead & EmailGuard API synchronization",
  },
};

export default function PortalHeader({
  onToggleMobileMenu,
}: {
  onToggleMobileMenu?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("loading");
  const [openIssues, setOpenIssues] = useState(0);

  let pageInfo = pageCategories[pathname] || {
    title: "Outreach Ops",
    category: "Portal",
    description: "Enterprise Cold Outreach Management",
  };

  if (pathname.startsWith("/clients/")) {
    pageInfo = {
      title: "Client Workspace",
      category: "Infrastructure",
      description: "Client configuration, domains & sending inboxes",
    };
  }

  useEffect(() => {
    loadSystemStatus();

    let lastAutoScan = 0;
    const runAutoAuditScan = async () => {
      const now = Date.now();
      // Debounce: minimum 25s between automatic background scans
      if (now - lastAutoScan < 25000) return;
      lastAutoScan = now;

      try {
        const res = await fetch("/api/issues/scan", { method: "POST" });
        if (res.ok) {
          await loadSystemStatus();
          window.dispatchEvent(new CustomEvent("outreach:refresh"));
        }
      } catch {
        // non-fatal background poll
      }
    };

    const handleWindowFocus = () => {
      if (document.visibilityState === "visible") {
        runAutoAuditScan();
      }
    };

    const handleAutoRefresh = () => {
      setRefreshing(true);
      router.refresh();
      loadSystemStatus().finally(() => {
        setLastRefresh(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        setTimeout(() => setRefreshing(false), 600);
      });
    };

    window.addEventListener("outreach:refresh", handleAutoRefresh);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    // Auto-poll system status every 15 seconds so header always reflects live issues in real-time
    const statusInterval = setInterval(() => {
      loadSystemStatus();
    }, 15000);

    // Auto-sync in background every 45 seconds while user is working
    const autoScanInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        runAutoAuditScan();
      }
    }, 45000);

    return () => {
      window.removeEventListener("outreach:refresh", handleAutoRefresh);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
      clearInterval(statusInterval);
      clearInterval(autoScanInterval);
    };
  }, [router]);

  async function loadSystemStatus() {
    try {
      const response = await fetch("/api/system-status", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();
      if (!response.ok) return;

      setSystemStatus(result.status);
      setOpenIssues(result.openIssues || 0);
    } catch {
      //
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);

    try {
      // Trigger live audit scan so newly introduced or solved issues update immediately
      await fetch("/api/issues/scan", { method: "POST" }).catch(() => {});
    } catch {
      // non-fatal
    }

    router.refresh();
    await loadSystemStatus();

    await new Promise((resolve) => setTimeout(resolve, 500));

    setLastRefresh(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    setRefreshing(false);
  }

  const statusUI = getStatusUI(systemStatus, openIssues);

  return (
    <header className="fixed top-0 left-0 lg:left-[250px] right-0 h-16 sm:h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 z-40 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] select-none">
      {/* Left: Mobile Toggle + Breadcrumbs & Page Heading */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase text-slate-400">
            <Link
              href="/dashboard"
              className="hover:text-indigo-600 transition-colors truncate hidden xs:inline"
            >
              Outreach Ops
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 hidden xs:inline" />
            <span className="text-indigo-600 font-bold lowercase first-letter:uppercase truncate">
              {pageInfo.category}
            </span>
            <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-300 mx-1" />
            <span className="hidden md:inline text-slate-400 font-normal lowercase first-letter:uppercase truncate max-w-[240px]">
              {pageInfo.description}
            </span>
          </div>

          <h1 className="text-base sm:text-lg md:text-[21px] font-extrabold tracking-tight text-slate-900 mt-0.5 truncate">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: Status, Refresh & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Last Refresh Timestamp */}
        {lastRefresh && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-[11px] text-slate-500 font-medium border border-slate-200/60">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Synced {lastRefresh}</span>
          </div>
        )}

        {/* Issue Quick Link if issues > 0 */}
        {openIssues > 0 && pathname !== "/issues" && (
          <Link
            href="/issues"
            className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100/90 border border-amber-200/80 shadow-xs transition-all active:scale-95"
            title="View detected issues"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            <span className="hidden sm:inline">{openIssues} Issues</span>
            <span className="sm:hidden">{openIssues}</span>
          </Link>
        )}

        {/* System Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs ${statusUI.badgeClasses}`}
          title="Overall Pipeline & API Connection Health"
        >
          {statusUI.icon}
          <span className="hidden sm:inline">{statusUI.label}</span>
        </div>

        {/* Refresh Action Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 active:scale-95 border border-slate-200/90 shadow-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
          title="Sync latest data from database and APIs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors ${
              refreshing ? "animate-spin text-indigo-600" : ""
            }`}
          />
          <span className="hidden sm:inline">
            {refreshing ? "Syncing..." : "Refresh"}
          </span>
        </button>
      </div>
    </header>
  );
}

function getStatusUI(status: SystemStatus, openIssues: number) {
  if (status === "critical") {
    return {
      label: `${openIssues} Critical Issues`,
      badgeClasses: "bg-rose-50 text-rose-700 border-rose-200/80",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
        </span>
      ),
    };
  }

  if (status === "warning") {
    return {
      label: `${openIssues} Issues Flagged`,
      badgeClasses: "bg-amber-50 text-amber-800 border-amber-200/80",
      icon: <TriangleAlert className="w-3.5 h-3.5 text-amber-600" />,
    };
  }



  if (status === "operational") {
    return {
      label: "All Systems Live",
      badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
      ),
    };
  }

  return {
    label: "Checking Pipeline",
    badgeClasses: "bg-slate-50 text-slate-600 border-slate-200/80",
    icon: <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />,
  };
}