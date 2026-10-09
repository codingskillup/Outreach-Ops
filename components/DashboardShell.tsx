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
  status: string;
  lastSynced: string | null;
};

const demoDashboard = {
  summary: {
    emailAccounts: 3648,
    healthyAccounts: 3520,
    needAttention: 128,
    activeCampaigns: 24,
    domains: 158,
    dailyCapacity: 145920,
    warmupAccounts: 3120,
  },
  todaysUpdate: {
    checkedAt: "8:04 AM",
    checkedAccounts: 3648,
    activeCampaigns: 24,
    domains: 158,
    newIssues: 12,
    resolved: 7,
  },
  accountHealth: {
    correctSettings: 3520,
    wrongDailyLimit: 42,
    warmupIssues: 31,
    connectionIssues: 8,
  },
  smartleadConnections: [
    {
      id: "demo-smartlead-main",
      name: "Smartlead Main Production",
      clients: ["TrialX", "Client Three", "Client Four", "Other Clients"],
      accounts: 3098,
      tagDistribution: [
        { name: "Hypertide Azure/Entra", count: 2853 },
        { name: "Hypertide Google", count: 222 },
        { name: "Google Workspace", count: 23 },
      ],
      activeCampaigns: 10,
      status: "connected",
      lastSynced: null,
    },
    {
      id: "demo-smartlead-two",
      name: "Smartlead Workspace B",
      clients: ["Reverba", "Apex Outreach"],
      accounts: 550,
      tagDistribution: [
        { name: "Hypertide Azure/Entra", count: 520 },
        { name: "Hypertide Google", count: 30 },
      ],
      activeCampaigns: 14,
      status: "connected",
      lastSynced: null,
    },
  ] satisfies ConnectionDisplay[],
  recentIssues: [
    {
      title: "Daily send limit drift detected",
      description:
        "42 sending accounts exceed the maximum daily threshold defined in Account Rules.",
      severity: "Critical",
      client: "TrialX",
    },
    {
      title: "Warmup ramp target mismatched",
      description:
        "Warmup email exchange volume is throttled below the required 30 emails/day target.",
      severity: "Warning",
      client: "Reverba",
    },
    {
      title: "DMARC authentication check needed",
      description:
        "EmailGuard flagged DNS record propagation delay on 2 newly connected domains.",
      severity: "Warning",
      client: "Apex Outreach",
    },
    {
      title: "SMTP Connection heartbeat timeout",
      description:
        "8 mailboxes experienced intermittent authentication retries with provider gateway.",
      severity: "Critical",
      client: "TrialX",
    },
  ],
};

export default function DashboardShell({
  liveData,
}: {
  liveData: DashboardLiveData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workspaces" | "infrastructure" | "clients">("workspaces");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("outreach:refresh"));
    }
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
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

  const mainCampaigns = safeCampaigns.filter(isMainCampaign);

  const activeCampaigns = mainCampaigns.filter(
    (campaign) => normalizeStatus(campaign.status) === "ACTIVE"
  );

  const enabledRuleMap = buildEnabledRuleMap(safeAccountRules);

  const accountHealthStatuses = safeEmailAccounts.map((account) =>
    getAccountHealthStatus(account, enabledRuleMap)
  );

  const healthyAccounts = accountHealthStatuses.filter(
    (status) => status === "healthy"
  ).length;

  const attentionAccounts = accountHealthStatuses.filter(
    (status) => status === "attention"
  ).length;

  const notEvaluatedAccounts = accountHealthStatuses.filter(
    (status) => status === "not_evaluated"
  ).length;

  const evaluatedAccounts = healthyAccounts + attentionAccounts;

  const totalAccounts = hasLiveSmartlead
    ? safeEmailAccounts.length
    : demoDashboard.summary.emailAccounts;

  const healthy = hasLiveSmartlead
    ? healthyAccounts
    : demoDashboard.summary.healthyAccounts;

  const needAttention = hasLiveSmartlead
    ? attentionAccounts
    : demoDashboard.summary.needAttention;

  const activeCampaignCount = hasLiveSmartlead
    ? activeCampaigns.length
    : demoDashboard.summary.activeCampaigns;

  const totalDomains = hasLiveSmartlead
    ? safeDomains.length
    : demoDashboard.summary.domains;

  const openIssues = safeIssues.filter((issue) => issue.status === "Open");
  const resolvedIssues = safeIssues.filter(
    (issue) => issue.status === "Resolved"
  );

  const criticalIssuesCount = openIssues.filter(
    (i) => i.severity === "Critical"
  ).length;

  const recentOpenIssues = openIssues.slice(0, 4);

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

  const displayConnections: ConnectionDisplay[] = hasLiveSmartlead
    ? smartleadConnections.map((connection) =>
        buildLiveConnection(
          connection,
          safeEmailAccounts,
          mainCampaigns
        )
      )
    : demoDashboard.smartleadConnections;

  const todayCheckedAccounts = hasLiveSmartlead
    ? latestSmartleadLogs.length > 0
      ? latestSmartleadLogs.reduce(
          (total, log) => total + log.accounts_fetched,
          0
        )
      : totalAccounts
    : demoDashboard.todaysUpdate.checkedAccounts;

  const todayActiveCampaigns = hasLiveSmartlead
    ? activeCampaignCount
    : demoDashboard.todaysUpdate.activeCampaigns;

  const todayDomainsChecked = hasLiveSmartlead
    ? latestEmailGuardLogs.length > 0
      ? latestEmailGuardLogs.reduce(
          (total, log) => total + log.domains_fetched,
          0
        )
      : totalDomains
    : demoDashboard.todaysUpdate.domains;

  const checkedAt =
    safeIntegrations.length > 0 && latestSync
      ? formatTime(latestSync.created_at)
      : demoDashboard.todaysUpdate.checkedAt;

  const displayedNewIssues = hasLiveSmartlead
    ? openIssues.length
    : demoDashboard.todaysUpdate.newIssues;

  const displayedResolved = hasLiveSmartlead
    ? resolvedIssues.length
    : demoDashboard.todaysUpdate.resolved;

  const healthRate = hasLiveSmartlead
    ? evaluatedAccounts > 0
      ? Math.round((healthyAccounts / evaluatedAccounts) * 100)
      : 0
    : totalAccounts > 0
    ? Math.round((healthy / totalAccounts) * 100)
    : 100;

  // Compute Total Daily Sending Fleet Capacity
  const computedDailyCapacity = useMemo(() => {
    if (!hasLiveSmartlead) return demoDashboard.summary.dailyCapacity;
    let sum = 0;
    for (const acc of safeEmailAccounts) {
      const cap = getNumber(acc.raw_data?.message_per_day);
      sum += cap || 0;
    }
    return sum > 0 ? sum : totalAccounts * 40;
  }, [hasLiveSmartlead, safeEmailAccounts, totalAccounts]);

  // Compute Active Warmup Mailbox Count
  const computedWarmupAccounts = useMemo(() => {
    if (!hasLiveSmartlead) return demoDashboard.summary.warmupAccounts;
    return safeEmailAccounts.filter((acc) => {
      const warmup = asObject(acc.raw_data?.warmup_details);
      return getWarmupEnabled(warmup?.status) === true;
    }).length;
  }, [hasLiveSmartlead, safeEmailAccounts]);

  // Compute Tag Aggregations across all accounts
  const tagBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const accounts = hasLiveSmartlead ? safeEmailAccounts : [];
    if (accounts.length === 0) {
      return [
        { name: "Hypertide Azure/Entra", count: 3373 },
        { name: "Hypertide Google", count: 252 },
        { name: "Google Workspace", count: 23 },
      ];
    }
    for (const acc of accounts) {
      const tags = getAccountTags(acc.raw_data || {});
      for (const t of tags) {
        counts.set(t.name, (counts.get(t.name) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [hasLiveSmartlead, safeEmailAccounts]);

  // Compute Client distribution
  const clientBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const accounts = hasLiveSmartlead ? safeEmailAccounts : [];
    if (accounts.length === 0) {
      return [
        { name: "TrialX", count: 1840 },
        { name: "Client Three", count: 820 },
        { name: "Reverba", count: 550 },
        { name: "Apex Outreach", count: 280 },
        { name: "Client Four", count: 158 },
      ];
    }
    for (const acc of accounts) {
      const raw = acc.raw_data || {};
      const client =
        getText(raw.client_name) ||
        getText(raw.clientName) ||
        getText(raw.client) ||
        "Unassigned";
      counts.set(client, (counts.get(client) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [hasLiveSmartlead, safeEmailAccounts]);

  const warmupRate =
    totalAccounts > 0
      ? Math.round((computedWarmupAccounts / totalAccounts) * 100)
      : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-16 space-y-5">
      {/* ── Critical Drift Alert Notification Bar (Shows if any Critical Issues) ── */}
      {criticalIssuesCount > 0 && (
        <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-500/10 via-rose-50/50 to-white p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-950 flex items-center gap-2">
                <span>{criticalIssuesCount} Critical Drift Violations Detected</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">Action Required</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Mailboxes are exceeding maximum daily sending limits or experiencing SMTP handshake failures.
              </p>
            </div>
          </div>
          <Link
            href="/issues"
            className="shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
          >
            <span>Review & Remediate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Cohesive Executive Telemetry Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
              <Radio className="w-3 h-3 text-indigo-500 animate-pulse" />
              Live Telemetry
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              hasLiveSmartlead
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                : "bg-sky-50 text-sky-700 border-sky-200/70"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hasLiveSmartlead ? "bg-emerald-500 animate-ping" : "bg-sky-500"}`} />
              {hasLiveSmartlead ? "Live Production Sync" : "Simulation Mode"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
              <Clock className="w-3 h-3 text-slate-400" />
              Last Sync: {checkedAt}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Outreach Fleet Operations & Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Continuous drift surveillance across sending mailboxes, warmup pacing, sequences, and DNS compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Trigger instant sync across all connected APIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : "text-slate-400"}`} />
            <span>{isRefreshing ? "Syncing Fleet..." : "Sync Fleet"}</span>
          </button>

          <Link
            href="/issues"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all shadow-xs"
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-xs"
          >
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>{safeIntegrations.length} Workspaces</span>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Rules & Thresholds</span>
          </Link>
        </div>
      </div>

      {/* ── 5 Primary Metric Cards (Vibrant, Eye-Friendly, High Contrast) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Sending Inboxes */}
        <Link
          href="/emailaccounts"
          className="group relative bg-gradient-to-br from-indigo-50/80 via-white to-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Fleet
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600/90">
              Total Inboxes
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {totalAccounts.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{healthy.toLocaleString()} compliant ({healthRate}%)</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-100/70 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">
              <span>Inspect mailboxes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 2. Mailbox Health */}
        <Link
          href="/emailaccounts"
          className="group relative bg-gradient-to-br from-emerald-50/80 via-white to-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Health
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/90">
              Compliance Rate
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 flex items-baseline gap-1">
              <span>{healthRate}</span>
              <span className="text-xl text-emerald-600 font-extrabold">%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{healthy.toLocaleString()} optimal status</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-100/70 flex items-center justify-between text-[11px] font-bold text-emerald-700 group-hover:text-emerald-900">
              <span>Audit compliance</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 3. Drift Violations */}
        <Link
          href="/issues"
          className="group relative bg-gradient-to-br from-amber-50/80 via-white to-white rounded-2xl border-2 border-amber-100 hover:border-amber-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${
              criticalIssuesCount > 0
                ? "bg-rose-500 text-white shadow-rose-500/25"
                : "bg-amber-500 text-white shadow-amber-500/25"
            }`}>
              <TriangleAlert className="w-5 h-5" />
            </div>
            {criticalIssuesCount > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                {criticalIssuesCount} Critical
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Drift
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700/90">
              Drift Deviations
            </div>
            <div className={`text-3xl font-black tracking-tight mt-0.5 ${needAttention > 0 ? "text-amber-800" : "text-slate-900"}`}>
              {needAttention.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className={`h-1.5 w-1.5 rounded-full ${needAttention > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span>{needAttention > 0 ? "Limits / warmup mismatched" : "Zero drift detected"}</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-100/70 flex items-center justify-between text-[11px] font-bold text-amber-700 group-hover:text-amber-900">
              <span>Resolve drift</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 4. Active Sequences */}
        <Link
          href="/campaigns"
          className="group relative bg-gradient-to-br from-purple-50/80 via-white to-white rounded-2xl border-2 border-purple-100 hover:border-purple-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Active
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700/90">
              Live Sequences
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {activeCampaignCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Smartlead campaigns active</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-100/70 flex items-center justify-between text-[11px] font-bold text-purple-700 group-hover:text-purple-900">
              <span>View campaigns</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* 5. DNS Domains */}
        <Link
          href="/domains"
          className="group relative bg-gradient-to-br from-cyan-50/80 via-white to-white rounded-2xl border-2 border-cyan-100 hover:border-cyan-400 p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
              DNS
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700/90">
              Sending Domains
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {totalDomains.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span>SPF · DKIM · DMARC passed</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-cyan-100/70 flex items-center justify-between text-[11px] font-bold text-cyan-700 group-hover:text-cyan-900">
              <span>Inspect DNS hygiene</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── Fleet Velocity & Operational Capacity Strip (High Value Telemetry) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Fleet Sending Velocity & Deliverability Shield
              </h2>
              <p className="text-[11px] text-slate-400">
                Aggregated daily volume capability and warmup protection telemetry
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            {displayConnections.length} Connected Workspaces · {totalAccounts.toLocaleString()} Mailboxes
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Velocity Metric 1 */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-900 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Daily Send Bandwidth
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900">
                Active Cap
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {computedDailyCapacity.toLocaleString()}{" "}
              <span className="text-xs font-semibold text-slate-500">emails/day</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-amber-200/60 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "85%" }} />
            </div>
          </div>

          {/* Velocity Metric 2 */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Warmup Protection
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900">
                {warmupRate}% Guarded
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {computedWarmupAccounts.toLocaleString()}{" "}
              <span className="text-xs font-semibold text-slate-500">inboxes active</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-emerald-200/60 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${warmupRate}%` }} />
            </div>
          </div>

          {/* Velocity Metric 3 */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-900 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Resilience Rating
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-200/70 text-indigo-900">
                Optimal
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {healthRate}%{" "}
              <span className="text-xs font-semibold text-slate-500">rule matched</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-indigo-200/60 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${healthRate}%` }} />
            </div>
          </div>

          {/* Velocity Metric 4 */}
          <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-900 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                DNS Compliance
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-200/70 text-cyan-900">
                SPF · DKIM
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalDomains}{" "}
              <span className="text-xs font-semibold text-slate-500">domains valid</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-cyan-200/60 overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Operations Split Grid (Left: Workspaces & Breakdown, Right: Today's Executive Pulse) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segmented Workspaces & Fleet Explorer Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Header with Navigation Pills */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Platform Workspaces & Infrastructure</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized account status, client portfolios, and tag profiles
                </p>
              </div>

              {/* Segmented View Tabs */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("workspaces")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "workspaces"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Workspaces ({displayConnections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("infrastructure")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "infrastructure"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tag Mix
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("clients")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "clients"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Clients ({clientBreakdown.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Workspaces List */}
            {activeTab === "workspaces" && (
              <div className="p-5 space-y-4">
                {displayConnections.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No workspaces connected yet</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Connect your Smartlead or EmailGuard API key to view live accounts.</p>
                    </div>
                    <Link
                      href="/connections"
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
                            <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                              {connection.accounts.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Campaigns
                            </span>
                            <span className="text-base font-extrabold text-indigo-700 mt-0.5 block">
                              {connection.activeCampaigns.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2 col-span-2 sm:col-span-2 text-left px-3">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                              Top Account Tags
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

            {/* Tab 2: Tag Mix Breakdown */}
            {activeTab === "infrastructure" && (
              <div className="p-5 space-y-4">
                <div className="text-xs text-slate-500 mb-2">
                  Distribution of mailboxes across discovered infrastructure tags:
                </div>
                <div className="space-y-3">
                  {tagBreakdown.map((tag) => {
                    const pct = totalAccounts > 0 ? Math.round((tag.count / totalAccounts) * 100) : 0;
                    return (
                      <div key={tag.name} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{tag.name}</span>
                          <span className="font-extrabold text-indigo-600">
                            {tag.count.toLocaleString()} inboxes ({pct}%)
                          </span>
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
              </div>
            )}

            {/* Tab 3: Client Breakdown */}
            {activeTab === "clients" && (
              <div className="p-5 space-y-4">
                <div className="text-xs text-slate-500 mb-2">
                  Mailbox allocation across your active client portfolios:
                </div>
                <div className="space-y-3">
                  {clientBreakdown.map((client) => {
                    const pct = totalAccounts > 0 ? Math.round((client.count / totalAccounts) * 100) : 0;
                    return (
                      <div key={client.name} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {client.name}
                          </span>
                          <span className="font-extrabold text-emerald-700">
                            {client.count.toLocaleString()} inboxes ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
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

        {/* Right Column: Today's Executive Pulse & Health Meter */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
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

              {/* Health Meter Widget */}
              <div className="p-5 pb-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800">
                      Mailbox Resilience Score
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      {healthRate}% Optimal
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${healthRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{healthy.toLocaleString()} compliant</span>
                    <span>{needAttention.toLocaleString()} drift flagged</span>
                  </div>
                </div>

                {/* Rows of Daily Metrics with interactive link affordance */}
                <div className="space-y-1 divide-y divide-slate-100 text-xs">
                  <Link
                    href="/emailaccounts"
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors group"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      Inboxes audited
                    </span>
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1">
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
                    <span className="font-bold text-indigo-700 group-hover:text-indigo-800 flex items-center gap-1">
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
                    <span className="font-bold text-slate-900 group-hover:text-cyan-700 flex items-center gap-1">
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
                      className={`font-bold flex items-center gap-1 ${
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
                    <span className="font-bold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1">
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

      {/* ── Secondary Operations Grid: Account Health Breakdown & Live Issues ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Health Distribution Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Account Health & Rule Compliance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribution of mailbox rules and drift compliance
                </p>
              </div>

              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {healthRate}% Compliant
              </span>
            </div>

            <div className="space-y-3.5 pt-3">
              <HealthProgressBar
                label="Optimal Settings (Compliant)"
                value={healthy}
                total={totalAccounts}
                color="emerald"
              />

              <HealthProgressBar
                label="Needs Review (Drift Flagged)"
                value={needAttention}
                total={totalAccounts}
                color="amber"
              />

              {hasLiveSmartlead && (
                <HealthProgressBar
                  label="Not Evaluated (No Rule Defined)"
                  value={notEvaluatedAccounts}
                  total={totalAccounts}
                  color="slate"
                />
              )}

              {!hasLiveSmartlead && (
                <>
                  <HealthProgressBar
                    label="Daily Cap Deviations"
                    value={demoDashboard.accountHealth.wrongDailyLimit}
                    total={totalAccounts}
                    color="yellow"
                  />

                  <HealthProgressBar
                    label="Warmup Setting Deviations"
                    value={demoDashboard.accountHealth.warmupIssues}
                    total={totalAccounts}
                    color="orange"
                  />

                  <HealthProgressBar
                    label="Disconnected / Error Accounts"
                    value={demoDashboard.accountHealth.connectionIssues}
                    total={totalAccounts}
                    color="rose"
                  />
                </>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/settings"
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Drift Rules & Thresholds</span>
            </Link>
          </div>
        </div>

        {/* Recent Detected Infrastructure Issues Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TriangleAlert className="w-4 h-4 text-amber-500" />
                  <span>Recent Infrastructure Issues</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest flagged anomalies requiring attention
                </p>
              </div>

              <Link
                href="/issues"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All ({openIssues.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {hasLiveSmartlead ? (
                recentOpenIssues.length > 0 ? (
                  recentOpenIssues.map((issue) => {
                    const isCritical = issue.severity === "Critical";

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
                              {issue.issue_type}
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
                            {issue.item}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span>Client: {issue.client || "General"}</span>
                            <span>•</span>
                            <span>{formatRelative(issue.last_seen_at)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-xs font-bold text-slate-800">
                      All systems operating optimally
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      No open issues detected on sending accounts
                    </span>
                  </div>
                )
              ) : (
                demoDashboard.recentIssues.map((issue, idx) => (
                  <Link
                    key={idx}
                    href="/issues"
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex items-start gap-3 group"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        issue.severity === "Critical"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <CircleAlert className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {issue.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            issue.severity === "Critical"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>

                      <p className="text-slate-500 line-clamp-1 mt-0.5">
                        {issue.description}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>Client: {issue.client}</span>
                        <span>•</span>
                        <span>Just now</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <Link
            href="/issues"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Run Deep Diagnostic Scan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Quick Launchpad & Operational Jump Bar ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Operations Launchpad
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct access across core outreach operational modules
            </p>
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Click any module to jump directly to live records
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Link
            href="/emailaccounts"
            className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 hover:border-indigo-300 text-slate-800 transition-all flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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
            className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-slate-800 transition-all flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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
            className="p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/70 hover:border-cyan-300 text-slate-800 transition-all flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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
            className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-slate-800 transition-all flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 text-slate-800 transition-all flex items-center gap-2.5 group col-span-2 sm:col-span-1"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
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

function HealthProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "emerald" | "amber" | "yellow" | "orange" | "rose" | "slate";
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  const bgBar =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "amber"
      ? "bg-amber-500"
      : color === "yellow"
      ? "bg-yellow-500"
      : color === "orange"
      ? "bg-orange-500"
      : color === "rose"
      ? "bg-rose-500"
      : "bg-slate-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-slate-900">{value.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px]">({percent}%)</span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${bgBar} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function buildLiveConnection(
  connection: Integration,
  allAccounts: EmailAccount[],
  allCampaigns: Campaign[]
): ConnectionDisplay {
  const accounts = allAccounts.filter(
    (account) => account.integration_id === connection.id
  );

  const campaigns = allCampaigns.filter(
    (campaign) =>
      campaign.integration_id === connection.id && isMainCampaign(campaign)
  );

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

  const clients = getConnectionClients(accounts, campaigns);

  return {
    id: connection.id,
    name: connection.name,
    clients,
    accounts: accounts.length,
    tagDistribution,
    activeCampaigns,
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
    const raw = account.raw_data || {};
    const name =
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client);

    if (name) {
      names.add(name);
    }
  }

  for (const campaign of campaigns) {
    const raw = campaign.raw_data || {};
    const name =
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client);

    if (name) {
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
