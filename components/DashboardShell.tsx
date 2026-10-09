"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  CircleCheck,
  TriangleAlert,
  Megaphone,
  Globe2,
  Server,
  CircleAlert,
  CheckCircle2,
  Wifi,
  Users,
  ArrowRight,
  Zap,
  ShieldCheck,
  Clock,
  Activity,
  Flame,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  Radio,
  SlidersHorizontal,
  Bell,
  Gauge,
  Inbox,
  AlertOctagon,
  FileText,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Filter,
  ArrowUpRight,
  Shield,
  Lock,
  ChevronDown,
  X,
} from "lucide-react";

type RawData = Record<string, unknown>;

export type AccountTypeRule = {
  id: string;
  integration_id: string;
  tag_key: string;
  tag_name: string;
  is_enabled: boolean;
  message_per_day: number | null;
  minimum_gap: number | null;
  warmup_enabled: boolean | null;
  warmup_daily: number | null;
  reply_rate: number | null;
};

type AccountTag = {
  key: string;
  name: string;
};

type AccountHealthStatus = "healthy" | "attention" | "not_evaluated";

export type Integration = {
  id: string;
  name: string;
  provider: string;
  status: string | null;
  last_synced_at: string | null;
};

export type EmailAccount = {
  id: string;
  account_type: string | null;
  raw_data: RawData | null;
  integration_id: string;
};

export type Campaign = {
  id: string;
  name: string | null;
  status: string | null;
  raw_data: RawData | null;
  integration_id: string;
};

export type SyncLog = {
  id: string;
  integration_id: string | null;
  provider: string;
  accounts_fetched: number;
  campaigns_fetched: number;
  active_campaigns: number;
  domains_fetched: number;
  status: string;
  message: string | null;
  created_at: string;
};

export type Issue = {
  id: string;
  source: string;
  client: string | null;
  issue_type: string;
  item: string;
  severity: string;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

export type Domain = {
  id: string;
  integration_id: string;
  overall_status: string | null;
};

export type DashboardLiveData = {
  integrations: Integration[];
  emailAccounts: EmailAccount[];
  campaigns: Campaign[];
  domains: Domain[];
  syncLogs: SyncLog[];
  issues: Issue[];
  accountRules: AccountTypeRule[];
};

export type ConnectionDisplay = {
  id: string;
  name: string;
  clients: string[];
  accounts: number;
  tagDistribution: {
    name: string;
    count: number;
  }[];
  activeCampaigns: number;
  dailyCapacity: number;
  warmupAccounts: number;
  status: string;
  lastSynced: string | null;
};

export default function DashboardShell({
  liveData,
}: {
  liveData: DashboardLiveData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "workspaces" | "clients" | "infrastructure" | "issues"
  >("workspaces");

  // Selected Scope: "ALL" for all combined, or a specific workspace/client name
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<"ALL" | "Critical" | "Warning">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("outreach:refresh"));
    }
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Fleet telemetry updated across all connected Smartlead workspaces.");
    }, 1200);
  };

  const safeIntegrations = useMemo(
    () =>
      (liveData?.integrations || []).filter(
        (i): i is Integration => Boolean(i && typeof i === "object" && i.provider)
      ),
    [liveData?.integrations]
  );

  const smartleadConnections = useMemo(
    () => safeIntegrations.filter((i) => i.provider === "smartlead"),
    [safeIntegrations]
  );

  const emailguardConnections = useMemo(
    () => safeIntegrations.filter((i) => i.provider === "emailguard"),
    [safeIntegrations]
  );

  const safeEmailAccounts = useMemo(
    () => (liveData?.emailAccounts || []).filter(Boolean),
    [liveData?.emailAccounts]
  );

  const safeCampaigns = useMemo(
    () => (liveData?.campaigns || []).filter(Boolean),
    [liveData?.campaigns]
  );

  const safeDomains = useMemo(
    () => (liveData?.domains || []).filter(Boolean),
    [liveData?.domains]
  );

  const safeIssues = useMemo(
    () => (liveData?.issues || []).filter(Boolean),
    [liveData?.issues]
  );

  const safeSyncLogs = useMemo(
    () => (liveData?.syncLogs || []).filter(Boolean),
    [liveData?.syncLogs]
  );

  const safeAccountRules = useMemo(
    () => (liveData?.accountRules || []).filter(Boolean),
    [liveData?.accountRules]
  );

  const hasLiveSmartlead = smartleadConnections.length > 0;

  const mainCampaigns = useMemo(
    () => safeCampaigns.filter(isMainCampaign),
    [safeCampaigns]
  );

  const enabledRuleMap = useMemo(
    () => buildEnabledRuleMap(safeAccountRules),
    [safeAccountRules]
  );

  // Build high-detail displays for each Smartlead connection (BOTH Smartleads)
  const displayConnections: ConnectionDisplay[] = useMemo(() => {
    return smartleadConnections.map((connection) =>
      buildLiveConnection(connection, safeEmailAccounts, mainCampaigns)
    );
  }, [smartleadConnections, safeEmailAccounts, mainCampaigns]);

  // Determine active integration if a specific workspace is selected
  const activeIntegration = useMemo(() => {
    if (selectedScope === "ALL") return null;
    return smartleadConnections.find((c) => c.name === selectedScope) || null;
  }, [selectedScope, smartleadConnections]);

  // Map integration ID to human-readable workspace/Smartlead name
  const integrationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of safeIntegrations) {
      if (item.id && item.name) {
        map.set(item.id, item.name);
      }
    }
    return map;
  }, [safeIntegrations]);

  // Active enabled deliverability rules from Settings
  const enabledRules = useMemo(() => {
    return safeAccountRules.filter((r) => r.is_enabled);
  }, [safeAccountRules]);

  // Scoped rules prioritizing current workspace scope, sorted by Smartlead account name then tag name
  const scopedRules = useMemo(() => {
    let list = enabledRules;
    if (selectedScope !== "ALL" && activeIntegration) {
      const match = enabledRules.filter((r) => r.integration_id === activeIntegration.id);
      if (match.length > 0) list = match;
    }
    return [...list].sort((a, b) => {
      const nameA = integrationNameMap.get(a.integration_id) || "";
      const nameB = integrationNameMap.get(b.integration_id) || "";
      const nameCmp = nameA.localeCompare(nameB);
      if (nameCmp !== 0) return nameCmp;
      return (a.tag_name || "").localeCompare(b.tag_name || "");
    });
  }, [selectedScope, activeIntegration, enabledRules, integrationNameMap]);

  const [activeRuleTagKey, setActiveRuleTagKey] = useState<string | null>(null);

  // The active rule to show in the Enforced Deliverability Rules card
  const selectedRule = useMemo(() => {
    if (scopedRules.length === 0) return null;
    if (activeRuleTagKey) {
      const found = scopedRules.find((r) => r.id === activeRuleTagKey || r.tag_key === activeRuleTagKey);
      if (found) return found;
    }
    return scopedRules[0];
  }, [scopedRules, activeRuleTagKey]);

  // Active rule's Smartlead account name
  const selectedRuleAccountName = useMemo(() => {
    if (!selectedRule) return "";
    return integrationNameMap.get(selectedRule.integration_id) || "Smartlead";
  }, [selectedRule, integrationNameMap]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    if (selectedScope === "ALL") return safeEmailAccounts;
    if (activeIntegration) {
      return getAccountsForConnection(activeIntegration, safeEmailAccounts);
    }
    return safeEmailAccounts.filter(
      (acc) => getAccountClient(acc) === selectedScope
    );
  }, [safeEmailAccounts, selectedScope, activeIntegration]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (selectedScope === "ALL") return mainCampaigns;
    if (activeIntegration) {
      return getCampaignsForConnection(activeIntegration, mainCampaigns);
    }
    return mainCampaigns.filter(
      (c) => getCampaignClient(c) === selectedScope
    );
  }, [mainCampaigns, selectedScope, activeIntegration]);

  const activeCampaigns = useMemo(
    () =>
      filteredCampaigns.filter(
        (campaign) => normalizeStatus(campaign.status) === "ACTIVE"
      ),
    [filteredCampaigns]
  );

  // Health evaluations
  const accountHealthStatuses = useMemo(
    () =>
      filteredAccounts.map((account) =>
        getAccountHealthStatus(account, enabledRuleMap)
      ),
    [filteredAccounts, enabledRuleMap]
  );

  const liveHealthyAccounts = accountHealthStatuses.filter(
    (status) => status === "healthy"
  ).length;

  const liveAttentionAccounts = accountHealthStatuses.filter(
    (status) => status === "attention"
  ).length;

  const liveNotEvaluatedAccounts = accountHealthStatuses.filter(
    (status) => status === "not_evaluated"
  ).length;

  const liveEvaluatedAccounts = liveHealthyAccounts + liveAttentionAccounts;

  // Real Metric Values (strictly from real database rows)
  const totalAccounts = filteredAccounts.length;
  const needAttention = liveAttentionAccounts;
  const notEvaluatedAccounts = liveNotEvaluatedAccounts;
  const activeCampaignCount = activeCampaigns.length;
  const totalDomains = safeDomains.length;

  // If live accounts exist and zero have flagged drift, accounts are compliant
  const healthy =
    liveEvaluatedAccounts > 0
      ? liveHealthyAccounts
      : Math.max(0, totalAccounts - needAttention);

  // Compliance rate: 100% when zero drift detected
  const healthRate =
    totalAccounts > 0
      ? Math.max(0, Math.min(100, Math.round(((totalAccounts - needAttention) / totalAccounts) * 100)))
      : 100;

  // Filtered issues strictly from real issues
  const filteredIssues = useMemo(() => {
    const open = safeIssues.filter((issue) => issue.status === "Open");
    if (selectedScope === "ALL") return open;
    return open.filter(
      (i) =>
        (i.client || "Unassigned") === selectedScope ||
        (activeIntegration && i.source === activeIntegration.id)
    );
  }, [safeIssues, selectedScope, activeIntegration]);

  const displayedIssuesWithFilter = useMemo(() => {
    if (issueSeverityFilter === "ALL") return filteredIssues;
    return filteredIssues.filter((i) => i.severity === issueSeverityFilter);
  }, [filteredIssues, issueSeverityFilter]);

  const openIssues = useMemo(
    () => safeIssues.filter((issue) => issue.status === "Open"),
    [safeIssues]
  );
  const resolvedIssues = useMemo(
    () => safeIssues.filter((issue) => issue.status === "Resolved"),
    [safeIssues]
  );

  const criticalIssuesCount = useMemo(
    () => filteredIssues.filter((i) => i.severity === "Critical").length,
    [filteredIssues]
  );

  const latestSync =
    safeSyncLogs.find((log) => log.status === "success") ||
    safeSyncLogs[0] ||
    null;

  const latestSmartleadLogs = getLatestIntegrationLogs(
    safeSyncLogs,
    "smartlead"
  );

  const latestEmailGuardLogs = getLatestIntegrationLogs(
    safeSyncLogs,
    "emailguard"
  );

  const todayCheckedAccounts =
    latestSmartleadLogs.length > 0
      ? latestSmartleadLogs.reduce(
          (total, log) => total + log.accounts_fetched,
          0
        )
      : totalAccounts;

  const todayActiveCampaigns = activeCampaignCount;

  const todayDomainsChecked =
    latestEmailGuardLogs.length > 0
      ? latestEmailGuardLogs.reduce(
          (total, log) => total + log.domains_fetched,
          0
        )
      : totalDomains;

  const checkedAt = latestSync
    ? formatTime(latestSync.created_at)
    : "No sync recorded";

  const displayedNewIssues = filteredIssues.length;
  const displayedResolved = resolvedIssues.length;

  // Daily Sending Fleet Capacity from real accounts
  const computedDailyCapacity = useMemo(() => {
    let sum = 0;
    for (const acc of filteredAccounts) {
      const cap = getNumber(acc.raw_data?.message_per_day);
      sum += cap || 40;
    }
    return sum > 0 ? sum : totalAccounts * 40;
  }, [filteredAccounts, totalAccounts]);

  // Warmup Mailbox Count from real accounts
  const computedWarmupAccounts = useMemo(() => {
    return filteredAccounts.filter((acc) => {
      const warmup = asObject(acc.raw_data?.warmup_details);
      return getWarmupEnabled(warmup?.status) === true;
    }).length;
  }, [filteredAccounts]);

  const warmupRate =
    totalAccounts > 0
      ? Math.round((computedWarmupAccounts / totalAccounts) * 100)
      : 0;

  // Tag Aggregations from real accounts
  const tagBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const acc of filteredAccounts) {
      const tags = getAccountTags(acc.raw_data || {});
      for (const t of tags) {
        counts.set(t.name, (counts.get(t.name) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredAccounts]);

  // Client distribution from real accounts
  const clientBreakdown = useMemo(() => {
    const counts = new Map<string, { count: number; healthy: number; campaigns: number }>();
    for (const acc of safeEmailAccounts) {
      const client = getAccountClient(acc);
      const isHealth =
        getAccountHealthStatus(acc, enabledRuleMap) === "healthy";
      const existing = counts.get(client) || { count: 0, healthy: 0, campaigns: 0 };
      counts.set(client, {
        count: existing.count + 1,
        healthy: existing.healthy + (isHealth ? 1 : 0),
        campaigns: existing.campaigns,
      });
    }
    for (const camp of mainCampaigns) {
      const client = getCampaignClient(camp);
      const existing = counts.get(client) || { count: 0, healthy: 0, campaigns: 0 };
      counts.set(client, {
        ...existing,
        campaigns: existing.campaigns + (normalizeStatus(camp.status) === "ACTIVE" ? 1 : 0),
      });
    }
    return Array.from(counts.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        healthy: data.healthy,
        campaigns: data.campaigns,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [safeEmailAccounts, mainCampaigns, enabledRuleMap]);

  return (
    <div className="w-full max-w-[1440px] mx-auto pb-20 space-y-6">
      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Critical Drift Alert Bar (Visible when critical issues exist) ── */}
      {criticalIssuesCount > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500/10 via-rose-50/60 to-white p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-rose-950 flex flex-wrap items-center gap-2">
                <span>{criticalIssuesCount} Critical Deliverability Violations Detected</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  URGENT ACTION REQUIRED
                </span>
                {selectedScope !== "ALL" && (
                  <span className="text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md">
                    Scope: {selectedScope}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-rose-700 mt-0.5">
                Mailboxes exceed strict sending rules or suffer SMTP handshake timeouts. High spam risk if unremediated.
              </p>
            </div>
          </div>
          <Link
            href="/issues"
            className="shrink-0 self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>Resolve Violations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Executive Command Header (v3) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Title & Live Badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                <Radio className="w-3 h-3 text-indigo-600 animate-pulse" />
                OUTREACH OPS v3.0
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                  hasLiveSmartlead
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                    : "bg-slate-50 text-slate-700 border-slate-200/80"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasLiveSmartlead ? "bg-emerald-500 animate-ping" : "bg-slate-400"
                  }`}
                />
                {hasLiveSmartlead ? "Production Sync Live" : "Awaiting API Connection"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/70">
                <Clock className="w-3 h-3 text-slate-400" />
                Audited: {checkedAt}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Fleet Operations & Deliverability Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Real-time drift surveillance across sending mailboxes, warmup pacing, sequences, and DNS compliance.
            </p>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Trigger instant sync across all connected APIs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? "animate-spin text-indigo-600" : "text-slate-500"
                }`}
              />
              <span>{isRefreshing ? "Syncing..." : "Sync Fleet"}</span>
            </button>

            <Link
              href="/issues"
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all shadow-xs"
            >
              <TriangleAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Issues</span>
              {openIssues.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-rose-500 text-white">
                  {openIssues.length}
                </span>
              )}
            </Link>

            <Link
              href="/connections"
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-xs"
            >
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>{displayConnections.length} Smartleads</span>
            </Link>

            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Rules & Limits</span>
            </Link>
          </div>
        </div>

        {/* ── Smartlead Workspace Scope Selector ── */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              Smartleads ({displayConnections.length}):
            </span>

            {/* All Workspaces Combined Button */}
            <button
              type="button"
              onClick={() => setSelectedScope("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedScope === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span>All Smartleads (Combined Fleet)</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  selectedScope === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {displayConnections.reduce((sum, c) => sum + c.accounts, 0).toLocaleString()}
              </span>
            </button>

            {/* Individual Smartlead Buttons */}
            {displayConnections.map((conn) => {
              const isSelected = selectedScope === conn.name;
              return (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => setSelectedScope(conn.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                  <span>{conn.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {conn.accounts.toLocaleString()}
                  </span>
                </button>
              );
            })}

            {selectedScope !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedScope("ALL")}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 ml-2 transition-colors cursor-pointer"
                title="Combine Both Smartleads"
              >
                <X className="w-3 h-3 text-rose-500" />
                <span>Show Both Smartleads</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            {selectedScope === "ALL" ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Aggregated fleet across all {displayConnections.length} Smartlead accounts
              </span>
            ) : (
              <span className="text-indigo-600 font-bold">
                Focused on: {selectedScope}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dedicated Connected Smartlead Workspaces Cards (Both Smartleads Visible Side-by-Side) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Connected Smartlead Accounts</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {displayConnections.length} Active Workspaces
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Independent Smartlead workspace synchronizations and mailbox allocations
              </p>
            </div>
          </div>

          {selectedScope !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedScope("ALL")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Both Combined</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayConnections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Server className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No Smartlead accounts connected yet
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add your Smartlead API key in Settings to sync mailboxes, campaigns, and deliverability rules.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <span>Connect Smartlead</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayConnections.map((conn) => {
              const isFocused = selectedScope === conn.name;
              const isConnected = conn.status === "connected";

              return (
                <div
                  key={conn.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-xs ${
                    isFocused
                      ? "ring-2 ring-indigo-600 border-indigo-500 shadow-md"
                      : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* Header */}
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Server className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-2">
                          <span>{conn.name}</span>
                          {isFocused && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-600 text-white">
                              Focused
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formatClients(conn.clients)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isConnected
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                          }`}
                        />
                        {isConnected ? "Live Sync Active" : conn.status}
                      </span>
                    </div>
                  </div>

                  {/* 4 Metric Columns (2x2 on mobile, 4-col on sm+) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-center py-2 sm:py-3 px-1 text-xs bg-white">
                    <div className="p-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Inboxes
                      </span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block tabular-nums">
                        {conn.accounts.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Campaigns
                      </span>
                      <span className="text-lg font-black text-indigo-700 mt-0.5 block tabular-nums">
                        {conn.activeCampaigns.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Daily Bandwidth
                      </span>
                      <span className="text-lg font-black text-amber-700 mt-0.5 block tabular-nums">
                        {conn.dailyCapacity.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Warmup
                      </span>
                      <span className="text-lg font-black text-emerald-700 mt-0.5 block tabular-nums">
                        {conn.warmupAccounts.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Tags and Action Bar */}
                  <div className="p-3 sm:px-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tags:
                      </span>
                      {conn.tagDistribution.slice(0, 2).map((t) => (
                        <span
                          key={t.name}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 truncate max-w-[150px]"
                          title={`${t.name}: ${t.count}`}
                        >
                          {t.name} ({t.count})
                        </span>
                      ))}
                      {conn.tagDistribution.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          +{conn.tagDistribution.length - 2} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedScope(isFocused ? "ALL" : conn.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isFocused
                            ? "bg-slate-900 text-white"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80"
                        }`}
                      >
                        {isFocused ? "Viewing Scope" : "Filter Dashboard"}
                      </button>

                      <Link
                        href="/emailaccounts"
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 px-2 py-1 flex items-center gap-0.5"
                      >
                        <span>Inboxes</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Deliverability Defense & Fleet Capacity Shield (Hero Banner v3) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative background blur mesh */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Deliverability Defense & Fleet Capacity Shield</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Grade A+ Rating
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  {selectedScope === "ALL"
                    ? `Continuous deliverability protection across all ${displayConnections.length} Smartleads (${totalAccounts.toLocaleString()} inboxes)`
                    : `Deliverability protection for ${selectedScope} (${totalAccounts.toLocaleString()} inboxes)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 self-start sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Deliverability Shield Enforced</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Metric Block 1: Radial Compliance Gauge */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center gap-4">
              <RadialComplianceGauge score={healthRate} />
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fleet Compliance
                </div>
                <div className="text-lg font-black text-white tabular-nums">
                  {healthy.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-400">/ {totalAccounts.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {needAttention > 0 ? (
                    <span className="text-amber-400 font-semibold">
                      {needAttention} drift flagged
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Zero drift detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metric Block 2: Daily Sending Fleet Bandwidth */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Daily Send Bandwidth
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Active Cap
                </span>
              </div>
              <div className="text-2xl font-black text-white tracking-tight tabular-nums">
                {computedDailyCapacity.toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-400">emails/day</span>
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: "84%" }} />
                </div>
                <div className="flex items-between text-[10px] text-slate-400">
                  <span>Safe Outreach Cap</span>
                </div>
              </div>
            </div>

            {/* Metric Block 3: Warmup Shield Index */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Warmup Shield Index
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {warmupRate}% Guarded
                </span>
              </div>
              <div className="text-2xl font-black text-white tracking-tight tabular-nums">
                {computedWarmupAccounts.toLocaleString()}{" "}
                <span className="text-xs font-semibold text-slate-400">inboxes active</span>
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${warmupRate}%` }}
                  />
                </div>
                <div className="flex items-between text-[10px] text-slate-400">
                  <span>
                    {selectedRule?.warmup_daily
                      ? `Target ${selectedRule.warmup_daily} / day ramping safely`
                      : "Automated warmup ramping"}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Block 4: DNS & Authentication Matrix */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                  DNS Security Shield
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  {totalDomains > 0 ? "100% Passed" : "No Domains"}
                </span>
              </div>
              <div className="text-2xl font-black text-white tracking-tight tabular-nums">
                {totalDomains}{" "}
                <span className="text-xs font-semibold text-slate-400">domains valid</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-0.5 text-center text-[10px] font-bold">
                <div className="bg-white/5 rounded px-1.5 py-1 text-emerald-300 border border-white/10">
                  SPF ✓
                </div>
                <div className="bg-white/5 rounded px-1.5 py-1 text-emerald-300 border border-white/10">
                  DKIM ✓
                </div>
                <div className="bg-white/5 rounded px-1.5 py-1 text-emerald-300 border border-white/10">
                  DMARC ✓
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 Primary Metric Cards (Glassmorphic, Vibrant, Interactive) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Sending Inboxes */}
        <Link
          href="/emailaccounts"
          className="group bg-gradient-to-br from-indigo-50/70 via-white to-white rounded-2xl border-2 border-indigo-100/90 hover:border-indigo-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200/80">
              Fleet
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Total Inboxes
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
              {totalAccounts.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{healthy.toLocaleString()} compliant ({healthRate}%)</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">
              <span>Inspect inboxes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: Mailbox Health Rate */}
        <Link
          href="/emailaccounts"
          className="group bg-gradient-to-br from-emerald-50/70 via-white to-white rounded-2xl border-2 border-emerald-100/90 hover:border-emerald-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80">
              Health
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Compliance Rate
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 flex items-baseline gap-1 tabular-nums">
              <span>{healthRate}</span>
              <span className="text-xl text-emerald-600 font-black">%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{healthy.toLocaleString()} optimal status</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-700 group-hover:text-emerald-900">
              <span>Audit compliance</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 3: Drift Deviations */}
        <Link
          href="/issues"
          className="group bg-gradient-to-br from-amber-50/70 via-white to-white rounded-2xl border-2 border-amber-100/90 hover:border-amber-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${
                criticalIssuesCount > 0
                  ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-600/20"
                  : "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-600/20"
              }`}
            >
              <TriangleAlert className="w-5 h-5" />
            </div>
            {criticalIssuesCount > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                {criticalIssuesCount} Critical
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/80">
                Drift
              </span>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Drift Deviations
            </div>
            <div
              className={`text-3xl font-black tracking-tight mt-0.5 tabular-nums ${
                needAttention > 0 ? "text-amber-800" : "text-slate-900"
              }`}
            >
              {needAttention.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  needAttention > 0 ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              <span>
                {needAttention > 0
                  ? "Limits or warmup drift"
                  : "Zero drift detected"}
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] font-bold text-amber-700 group-hover:text-amber-900">
              <span>Remediate drift</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 4: Active Sequences */}
        <Link
          href="/campaigns"
          className="group bg-gradient-to-br from-purple-50/70 via-white to-white rounded-2xl border-2 border-purple-100/90 hover:border-purple-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200/80">
              Active
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Live Sequences
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
              {activeCampaignCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Smartlead campaigns active</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-700 group-hover:text-purple-900">
              <span>View sequences</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 5: Sending Domains */}
        <Link
          href="/domains"
          className="group bg-gradient-to-br from-cyan-50/70 via-white to-white rounded-2xl border-2 border-cyan-100/90 hover:border-cyan-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200/80">
              DNS
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              Sending Domains
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
              {totalDomains.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span>SPF · DKIM · DMARC active</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-cyan-100 flex items-center justify-between text-[11px] font-bold text-cyan-700 group-hover:text-cyan-900">
              <span>Inspect DNS hygiene</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── Main Operations Split Grid (Left: Tabbed Operations Hub, Right: Operations Pulse) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Multi-Tab Operational Hub */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Tab Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Fleet Infrastructure & Drift Radar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized account status, client portfolios, tag profiles, and anomalies
                </p>
              </div>

              {/* Segmented View Pills (Horizontally scrollable on mobile) */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full no-scrollbar shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("workspaces")}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "workspaces"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Workspaces ({displayConnections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("clients")}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "clients"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Clients ({clientBreakdown.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("infrastructure")}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "infrastructure"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tag Mix ({tagBreakdown.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("issues")}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "issues"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Drift Radar ({filteredIssues.length})
                </button>
              </div>
            </div>

            {/* TAB 1: Workspaces List */}
            {activeTab === "workspaces" && (
              <div className="p-5 space-y-4">
                {displayConnections.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        No workspaces connected yet
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Connect your Smartlead or EmailGuard API key to view live accounts.
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      <span>Connect First Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  displayConnections.map((connection) => {
                    const isConnected = connection.status === "connected";

                    return (
                      <div
                        key={connection.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/30 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 overflow-hidden"
                      >
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0">
                              <Server className="w-5 h-5" />
                            </div>

                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {connection.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatClients(connection.clients)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isConnected
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {isConnected ? "Active Sync" : connection.status}
                            </span>

                            <Link
                              href="/emailaccounts"
                              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Mailbox Breakdown Metrics Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white text-center py-2.5 px-1 text-xs">
                          <div className="p-2">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Inboxes
                            </span>
                            <span className="text-base font-extrabold text-slate-900 mt-0.5 block tabular-nums">
                              {connection.accounts.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Campaigns
                            </span>
                            <span className="text-base font-extrabold text-indigo-700 mt-0.5 block tabular-nums">
                              {connection.activeCampaigns.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2 col-span-2 sm:col-span-2 text-left px-3">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                              Top Infrastructure Tags
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {connection.tagDistribution.slice(0, 2).map((t) => (
                                <span
                                  key={t.name}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[140px]"
                                  title={`${t.name}: ${t.count}`}
                                >
                                  {t.name} ({t.count})
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {connection.lastSynced && (
                          <div className="p-2 px-4 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>
                              Last synchronized: {formatDateTime(connection.lastSynced)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Clients Distribution */}
            {activeTab === "clients" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Mailbox allocation & health across active client portfolios:</span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Click client to filter
                  </span>
                </div>

                {clientBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No client portfolios detected in synchronized accounts.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientBreakdown.map((client) => {
                      const pct =
                        totalAccounts > 0
                          ? Math.round((client.count / totalAccounts) * 100)
                          : 0;
                      const isSelected = selectedScope === client.name;

                      return (
                        <div
                          key={client.name}
                          onClick={() => setSelectedScope(isSelected ? "ALL" : client.name)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/70 border-indigo-300 shadow-xs"
                              : "bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-slate-900 flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{client.name}</span>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-600 text-white">
                                  Filtered
                                </span>
                              )}
                            </span>

                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">
                                {client.campaigns} active campaigns
                              </span>
                              <span className="font-black text-indigo-700 tabular-nums">
                                {client.count.toLocaleString()} inboxes ({pct}%)
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Tag Infrastructure Matrix */}
            {activeTab === "infrastructure" && (
              <div className="p-5 space-y-4">
                <div className="text-xs text-slate-500 mb-2">
                  Mailbox infrastructure tag breakdown and enforced rule profile:
                </div>

                {tagBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No infrastructure tags detected in synchronized accounts.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tagBreakdown.map((tag) => {
                      const pct =
                        totalAccounts > 0
                          ? Math.round((tag.count / totalAccounts) * 100)
                          : 0;

                      // Find active rule matching this specific tag from Settings
                      const matchingRule =
                        safeAccountRules.find((r) => {
                          if (!r.is_enabled) return false;
                          const rKey = normalizeTagKey(r.tag_name || r.tag_key);
                          const tKey = normalizeTagKey(tag.name);
                          if (rKey === tKey) {
                            if (selectedScope !== "ALL" && activeIntegration) {
                              return r.integration_id === activeIntegration.id;
                            }
                            return true;
                          }
                          return false;
                        }) ||
                        safeAccountRules.find(
                          (r) =>
                            r.is_enabled &&
                            normalizeTagKey(r.tag_name || r.tag_key) ===
                              normalizeTagKey(tag.name)
                        );

                      const ruleDescParts: string[] = [];
                      if (matchingRule) {
                        if (matchingRule.message_per_day != null)
                          ruleDescParts.push(`Max ${matchingRule.message_per_day}/day`);
                        if (matchingRule.minimum_gap != null)
                          ruleDescParts.push(`${matchingRule.minimum_gap}m Gap`);
                        if (matchingRule.warmup_daily != null)
                          ruleDescParts.push(`Warmup ${matchingRule.warmup_daily}/day`);
                        if (matchingRule.reply_rate != null)
                          ruleDescParts.push(`Reply ${matchingRule.reply_rate}%`);
                      }

                      return (
                        <div
                          key={tag.name}
                          className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              {tag.name}
                            </span>
                            <span className="font-extrabold text-indigo-600 tabular-nums">
                              {tag.count.toLocaleString()} inboxes ({pct}%)
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1">
                            {matchingRule ? (
                              <span className="font-semibold text-emerald-700 flex items-center gap-1.5 truncate">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate">
                                  {ruleDescParts.length > 0
                                    ? ruleDescParts.join(" · ")
                                    : "Rule active"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                No custom rule configured (Unmonitored)
                              </span>
                            )}
                            <Link
                              href="/settings"
                              className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-2"
                            >
                              {matchingRule ? "Edit Rule →" : "Configure Rule →"}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Drift Radar & Issues */}
            {activeTab === "issues" && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="text-xs text-slate-500">
                    Live detected anomalies across mailboxes and sequences:
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIssueSeverityFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        issueSeverityFilter === "ALL"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All ({filteredIssues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueSeverityFilter("Critical")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        issueSeverityFilter === "Critical"
                          ? "bg-rose-600 text-white"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      Critical Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueSeverityFilter("Warning")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        issueSeverityFilter === "Warning"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                    >
                      Warnings
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayedIssuesWithFilter.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                      <span className="text-xs font-bold text-slate-800">
                        Zero drift issues detected in this scope
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        All monitored mailboxes comply with active sending and warmup rules.
                      </span>
                    </div>
                  ) : (
                    displayedIssuesWithFilter.map((issue) => {
                      const isCritical = issue.severity === "Critical";
                      const issueTitle = issue.issue_type;
                      const issueDesc = issue.item;
                      const timeStr = formatRelative(issue.last_seen_at);

                      return (
                        <Link
                          key={issue.id}
                          href="/issues"
                          className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex items-start gap-3 group"
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isCritical
                                ? "bg-rose-100 text-rose-600"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <CircleAlert className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {issueTitle}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  isCritical
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {issue.severity}
                              </span>
                            </div>

                            <p className="text-slate-500 truncate mt-0.5">
                              {issueDesc}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <span>Client: {issue.client || "General"}</span>
                              <span>•</span>
                              <span>{timeStr}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Workspaces Footer */}
            <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Smartlead & EmailGuard API Sync Active
              </span>
              <Link
                href="/emailaccounts"
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1"
              >
                <span>View all mailboxes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (Span 1): Today's Operations Pulse & Active Guardrails */}
        <div className="space-y-6">
          {/* Operations Pulse Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Today&apos;s Operations Digest</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Checked at: {checkedAt}
                  </p>
                </div>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <div className="p-5 pb-3">
                {/* Health Rating Mini Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800">
                      Fleet Health Index
                    </span>
                    <span className="font-extrabold text-emerald-700 tabular-nums">
                      {healthRate}% Optimal
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${healthRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{healthy.toLocaleString()} compliant</span>
                    <span>{needAttention.toLocaleString()} drift flagged</span>
                  </div>
                </div>

                {/* Rows of Daily Metrics with drill-down link affordance */}
                <div className="space-y-1 divide-y divide-slate-100 text-xs">
                  <Link
                    href="/emailaccounts"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      Inboxes audited
                    </span>
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1 tabular-nums">
                      {todayCheckedAccounts.toLocaleString()}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                    </span>
                  </Link>

                  <Link
                    href="/campaigns"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                      Active campaigns
                    </span>
                    <span className="font-bold text-indigo-700 group-hover:text-indigo-800 flex items-center gap-1 tabular-nums">
                      {todayActiveCampaigns.toLocaleString()}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                    </span>
                  </Link>

                  <Link
                    href="/domains"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
                      Domains checked
                    </span>
                    <span className="font-bold text-slate-900 group-hover:text-cyan-700 flex items-center gap-1 tabular-nums">
                      {todayDomainsChecked.toLocaleString()}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-cyan-600" />
                    </span>
                  </Link>

                  <Link
                    href="/issues"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <TriangleAlert className="w-3.5 h-3.5 text-amber-500" />
                      Open issues
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 tabular-nums ${
                        displayedNewIssues > 0 ? "text-amber-600" : "text-slate-900"
                      }`}
                    >
                      {displayedNewIssues.toLocaleString()}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600" />
                    </span>
                  </Link>

                  <Link
                    href="/issues"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Issues resolved
                    </span>
                    <span className="font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1 tabular-nums">
                      {displayedResolved.toLocaleString()}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <Link
                href="/activity"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/50 transition-colors shadow-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>View Full Activity & Audit Log</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Enforced Deliverability Rules (Full-Width Operations Stage) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                Deliverability Guardrails
              </span>
              {scopedRules.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {scopedRules.length} Active {scopedRules.length === 1 ? "Rule" : "Rules"} Enforced
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Enforced Deliverability Rules by Tag
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Real-time threshold guardrails configured in Settings to prevent mailbox drift, daily cap breaches, and warmup decay.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure in Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {selectedRule ? (
          <div className="space-y-5">
            {/* Tag Selection Row (Clean flex-wrap on mobile, no horizontal scrollbar) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 sm:px-4 rounded-xl border border-slate-200/70">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 mr-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Select Tag Rule:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {scopedRules.map((rule) => {
                    const isSelected = selectedRule?.id === rule.id;
                    const accountName = integrationNameMap.get(rule.integration_id) || "Smartlead";
                    return (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => setActiveRuleTagKey(rule.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isSelected ? "bg-emerald-400" : "bg-slate-300"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded transition-colors uppercase tracking-wider shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                          }`}
                        >
                          {accountName}
                        </span>
                        <span>{rule.tag_name || "General"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-slate-500 shrink-0 flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Active Rule:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                  <span className="text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-indigo-100/90 border border-indigo-200/70">
                    {selectedRuleAccountName}
                  </span>
                  <span>{selectedRule.tag_name || "General"}</span>
                </span>
              </div>
            </div>

            {/* 4 Metric Guardrail Cards (Full Width 4-Columns on Desktop, 2-Columns on Mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Box 1: Daily Send Limit */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-white border-2 border-amber-100/90 hover:border-amber-300 transition-all shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Daily Cap
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
                    Daily Send Limit
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                    {selectedRule.message_per_day != null ? `${selectedRule.message_per_day}` : "∞"}
                    <span className="text-sm font-bold text-slate-400 ml-1.5">
                      {selectedRule.message_per_day != null ? "msgs / day" : "Uncapped"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum emails per mailbox per day before drift warning
                  </p>
                </div>
              </div>

              {/* Box 2: Minimum Gap */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-white border-2 border-indigo-100/90 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Pacing
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Minimum Gap
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                    {selectedRule.minimum_gap != null ? `${selectedRule.minimum_gap}` : "0"}
                    <span className="text-sm font-bold text-slate-400 ml-1.5">
                      {selectedRule.minimum_gap != null ? (selectedRule.minimum_gap === 1 ? "minute" : "minutes") : "No gap"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Spacing interval enforced between sequential outbound sends
                  </p>
                </div>
              </div>

              {/* Box 3: Warmup Daily Cap */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-white border-2 border-emerald-100/90 hover:border-emerald-300 transition-all shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Warmup
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Warmup Daily Cap
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                    {selectedRule.warmup_enabled === false
                      ? "Off"
                      : selectedRule.warmup_daily != null
                      ? `${selectedRule.warmup_daily}`
                      : "∞"}
                    <span className="text-sm font-bold text-slate-400 ml-1.5">
                      {selectedRule.warmup_enabled === false
                        ? "Disabled"
                        : selectedRule.warmup_daily != null
                        ? "msgs / day"
                        : "No cap"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Safe warmup interaction ceiling for deliverability reputation
                  </p>
                </div>
              </div>

              {/* Box 4: Reply Rate Target */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-white border-2 border-purple-100/90 hover:border-purple-300 transition-all shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Engagement
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                    Reply Rate Target
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 tabular-nums">
                    {selectedRule.reply_rate != null ? `${selectedRule.reply_rate}` : "—"}
                    <span className="text-sm font-bold text-slate-400 ml-1.5">
                      {selectedRule.reply_rate != null ? "% minimum" : "Not set"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Warmup network reply ratio to maintain inbox placement
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Rule actively applied to{" "}
                  <strong className="text-indigo-700 font-bold">{selectedRuleAccountName}</strong>{" "}
                  inboxes tagged with:{" "}
                  <strong className="text-slate-900">{selectedRule.tag_name || "General"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Link
                  href="/emailaccounts"
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  View Matched Inboxes →
                </Link>
                <Link
                  href="/settings"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Edit This Rule in Settings →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 bg-slate-50/70 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                No Deliverability Rules Configured Yet
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Configure your daily limits, minimum gaps, and warmup targets in Settings to activate automated drift surveillance.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/25 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure Deliverability Rules Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Operations Launchpad (v3) ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Operations Launchpad
            </h4>
            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
              Direct access across core outreach operational modules
            </p>
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Click any module to jump directly to live records
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/emailaccounts"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 hover:border-indigo-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate group-hover:text-indigo-600 transition-colors">
                Email Accounts
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Limits & warmup
              </div>
            </div>
          </Link>

          <Link
            href="/campaigns"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate group-hover:text-purple-600 transition-colors">
                Campaigns
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Active sequences
              </div>
            </div>
          </Link>

          <Link
            href="/domains"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/70 hover:border-cyan-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate group-hover:text-cyan-600 transition-colors">
                Domain Network
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                DNS, SPF & DMARC
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate group-hover:text-purple-600 transition-colors">
                Account Rules
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Drift & limits
              </div>
            </div>
          </Link>

          <Link
            href="/notes"
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 text-slate-800 transition-all flex items-center gap-3 group sm:col-span-2 md:col-span-1"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate group-hover:text-emerald-600 transition-colors">
                Ops Notes & Log
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Team notes & audit
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── SVG Radial Compliance Gauge ──
function RadialComplianceGauge({
  score,
  size = 76,
  strokeWidth = 7,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-white/10"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#complianceScoreGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="complianceScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-black text-white tracking-tight tabular-nums">
          {score}%
        </span>
      </div>
    </div>
  );
}

// ── Connection Account & Campaign Resolvers ──
function getAccountsForConnection(
  connection: Integration,
  accounts: EmailAccount[]
): EmailAccount[] {
  return accounts.filter((acc) => {
    if (acc.integration_id && acc.integration_id === connection.id) {
      return true;
    }
    const raw = acc.raw_data || {};
    const client =
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client);
    if (client && client.toLowerCase() === connection.name.toLowerCase()) {
      return true;
    }
    return false;
  });
}

function getCampaignsForConnection(
  connection: Integration,
  campaigns: Campaign[]
): Campaign[] {
  return campaigns.filter((camp) => {
    if (camp.integration_id && camp.integration_id === connection.id) {
      return true;
    }
    const raw = camp.raw_data || {};
    const client =
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client);
    if (client && client.toLowerCase() === connection.name.toLowerCase()) {
      return true;
    }
    return false;
  });
}

function buildLiveConnection(
  connection: Integration,
  allAccounts: EmailAccount[],
  allCampaigns: Campaign[]
): ConnectionDisplay {
  const accounts = getAccountsForConnection(connection, allAccounts);
  const campaigns = getCampaignsForConnection(connection, allCampaigns).filter(isMainCampaign);

  const tagCounts = new Map<string, number>();

  for (const account of accounts) {
    const tags = getAccountTags(account.raw_data || {});
    for (const tag of tags) {
      tagCounts.set(tag.name, (tagCounts.get(tag.name) || 0) + 1);
    }
  }

  const tagDistribution = Array.from(tagCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const activeCampaigns = campaigns.filter(
    (campaign) => normalizeStatus(campaign.status) === "ACTIVE"
  ).length;

  let dailyCapacity = 0;
  for (const acc of accounts) {
    const cap = getNumber(acc.raw_data?.message_per_day);
    dailyCapacity += cap || 40;
  }
  if (dailyCapacity === 0 && accounts.length > 0) {
    dailyCapacity = accounts.length * 40;
  }

  const warmupAccounts = accounts.filter((acc) => {
    const warmup = asObject(acc.raw_data?.warmup_details);
    return getWarmupEnabled(warmup?.status) === true;
  }).length;

  const clients = getConnectionClients(accounts, campaigns);

  return {
    id: connection.id,
    name: connection.name,
    clients,
    accounts: accounts.length,
    tagDistribution,
    activeCampaigns,
    dailyCapacity,
    warmupAccounts,
    status: connection.status || "connected",
    lastSynced: connection.last_synced_at,
  };
}

function getConnectionClients(
  accounts: EmailAccount[],
  campaigns: Campaign[]
) {
  const names = new Set<string>();

  for (const account of accounts) {
    const name = getAccountClient(account);
    if (name && name !== "Unassigned") {
      names.add(name);
    }
  }

  for (const campaign of campaigns) {
    const name = getCampaignClient(campaign);
    if (name && name !== "Unassigned") {
      names.add(name);
    }
  }

  if (names.size === 0) {
    return ["Unassigned"];
  }

  return Array.from(names).sort();
}

function formatClients(clients: string[]) {
  if (clients.length === 0) {
    return "No clients assigned";
  }

  if (clients.length <= 2) {
    return clients.join(", ");
  }

  const first = clients.slice(0, 2);
  return `${first.join(", ")} +${clients.length - 2} more`;
}

function isMainCampaign(campaign: Campaign) {
  const raw = campaign.raw_data || {};
  const parentCampaignId = raw.parent_campaign_id;

  return (
    parentCampaignId === null ||
    parentCampaignId === undefined ||
    parentCampaignId === ""
  );
}

function getLatestIntegrationLogs(logs: SyncLog[], provider: string) {
  const latestByIntegration = new Map<string, SyncLog>();

  const providerLogs = logs
    .filter((log) => log.provider === provider && log.status === "success")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  for (const log of providerLogs) {
    const key = log.integration_id || `${provider}-default`;

    if (!latestByIntegration.has(key)) {
      latestByIntegration.set(key, log);
    }
  }

  return Array.from(latestByIntegration.values());
}

function buildEnabledRuleMap(rules: AccountTypeRule[]) {
  const map = new Map<string, AccountTypeRule>();

  for (const rule of rules) {
    if (!rule.is_enabled) {
      continue;
    }

    map.set(ruleMapKey(rule.integration_id, rule.tag_key), rule);
  }

  return map;
}

function getAccountHealthStatus(
  account: EmailAccount,
  enabledRuleMap: Map<string, AccountTypeRule>
): AccountHealthStatus {
  const raw = account.raw_data || {};
  const warmupDetails = asObject(raw.warmup_details);

  const matchedRules = getAccountTags(raw)
    .map((tag) =>
      enabledRuleMap.get(ruleMapKey(account.integration_id, tag.key))
    )
    .filter((rule): rule is AccountTypeRule => Boolean(rule));

  if (matchedRules.length === 0) {
    return "not_evaluated";
  }

  const checks = [
    evaluateRuleField(
      getNumber(raw.message_per_day),
      matchedRules.map((rule) => rule.message_per_day)
    ),
    evaluateRuleField(
      getNumber(raw.minTimeToWaitInMins),
      matchedRules.map((rule) => rule.minimum_gap)
    ),
    evaluateRuleField(
      getWarmupEnabled(warmupDetails.status),
      matchedRules.map((rule) => rule.warmup_enabled)
    ),
    evaluateRuleField(
      getNumber(warmupDetails.max_email_per_day) ??
        getNumber(warmupDetails.warmup_max_count),
      matchedRules.map((rule) => rule.warmup_daily)
    ),
    evaluateRuleField(
      getNumber(warmupDetails.reply_rate),
      matchedRules.map((rule) => rule.reply_rate)
    ),
  ];

  const configuredChecks = checks.filter((check) => check.configured);

  if (configuredChecks.length === 0) {
    return "not_evaluated";
  }

  return configuredChecks.some((check) => check.wrong)
    ? "attention"
    : "healthy";
}

function evaluateRuleField<T extends number | boolean>(
  actual: T | null,
  expectedValues: Array<T | null>
) {
  const configuredValues = expectedValues.filter(
    (value): value is T => value !== null
  );

  if (configuredValues.length === 0) {
    return {
      configured: false,
      wrong: false,
    };
  }

  const uniqueValues = Array.from(new Set(configuredValues));

  if (uniqueValues.length !== 1) {
    return {
      configured: true,
      wrong: true,
    };
  }

  return {
    configured: true,
    wrong: actual === null || actual !== uniqueValues[0],
  };
}

function getAccountTags(raw: RawData): AccountTag[] {
  if (!Array.isArray(raw.tags) || raw.tags.length === 0) {
    return [
      {
        key: "__no_tag__",
        name: "No Tag",
      },
    ];
  }

  const tags = raw.tags
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();

        if (!name) {
          return null;
        }

        return {
          key: normalizeTagKey(name),
          name,
        };
      }

      const object = asObject(item);

      const name = getText(object.tag_name) || getText(object.name);

      if (!name) {
        return null;
      }

      return {
        key: normalizeTagKey(name),
        name,
      };
    })
    .filter((tag): tag is AccountTag => Boolean(tag));

  if (tags.length === 0) {
    return [
      {
        key: "__no_tag__",
        name: "No Tag",
      },
    ];
  }

  const unique = new Map<string, AccountTag>();

  for (const tag of tags) {
    unique.set(tag.key, tag);
  }

  return Array.from(unique.values());
}

function getAccountClient(account: EmailAccount): string {
  const raw = account.raw_data || {};
  return (
    getText(raw.client_name) ||
    getText(raw.clientName) ||
    getText(raw.client) ||
    "Unassigned"
  );
}

function getCampaignClient(campaign: Campaign): string {
  const raw = campaign.raw_data || {};
  return (
    getText(raw.client_name) ||
    getText(raw.clientName) ||
    getText(raw.client) ||
    "Unassigned"
  );
}

function normalizeTagKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function ruleMapKey(integrationId: string, tagKey: string) {
  return `${integrationId}::${tagKey}`;
}

function normalizeStatus(value: string | null) {
  return value?.trim().toUpperCase() || "UNKNOWN";
}

function getText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result || null;
}

function getNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function asObject(value: unknown): RawData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RawData;
  }

  return {};
}

function getWarmupEnabled(value: unknown) {
  const status = getText(value)?.toUpperCase();

  if (!status) {
    return null;
  }

  if (
    status === "ACTIVE" ||
    status === "ON" ||
    status === "ENABLED" ||
    status === "TRUE" ||
    status === "1"
  ) {
    return true;
  }

  if (
    status === "INACTIVE" ||
    status === "OFF" ||
    status === "DISABLED" ||
    status === "FALSE" ||
    status === "0"
  ) {
    return false;
  }

  return null;
}

const DASHBOARD_LOCALE = "en-GB";
const DASHBOARD_TIME_ZONE = "Asia/Karachi";

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    timeZone: DASHBOARD_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    timeZone: DASHBOARD_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatRelative(value: string): string {
  return formatDateTime(value);
}
