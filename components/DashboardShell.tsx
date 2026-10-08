"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  const [activeTab, setActiveTab] = useState<"workspaces" | "infrastructure" | "deliverability">("workspaces");

  const smartleadConnections = liveData.integrations.filter(
    (integration) => integration.provider === "smartlead"
  );
  const emailguardConnections = liveData.integrations.filter(
    (integration) => integration.provider === "emailguard"
  );

  const hasLiveSmartlead = smartleadConnections.length > 0;

  const mainCampaigns = liveData.campaigns.filter(isMainCampaign);

  const activeCampaigns = mainCampaigns.filter(
    (campaign) => normalizeStatus(campaign.status) === "ACTIVE"
  );

  const enabledRuleMap = buildEnabledRuleMap(liveData.accountRules);

  const accountHealthStatuses = liveData.emailAccounts.map((account) =>
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
    ? liveData.emailAccounts.length
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
    ? liveData.domains.length
    : demoDashboard.summary.domains;

  const openIssues = liveData.issues.filter((issue) => issue.status === "Open");
  const resolvedIssues = liveData.issues.filter(
    (issue) => issue.status === "Resolved"
  );

  const criticalIssuesCount = openIssues.filter(
    (i) => i.severity === "Critical"
  ).length;

  const recentOpenIssues = openIssues.slice(0, 4);

  const latestSync =
    liveData.syncLogs.find((log) => log.status === "success") ||
    liveData.syncLogs[0] ||
    null;

  const latestSmartleadLogs = getLatestIntegrationLogs(
    liveData.syncLogs,
    "smartlead"
  );

  const latestEmailGuardLogs = getLatestIntegrationLogs(
    liveData.syncLogs,
    "emailguard"
  );

  const displayConnections: ConnectionDisplay[] = hasLiveSmartlead
    ? smartleadConnections.map((connection) =>
        buildLiveConnection(
          connection,
          liveData.emailAccounts,
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
    liveData.integrations.length > 0 && latestSync
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
    for (const acc of liveData.emailAccounts) {
      const cap = getNumber(acc.raw_data?.message_per_day);
      sum += cap || 0;
    }
    return sum > 0 ? sum : totalAccounts * 40;
  }, [hasLiveSmartlead, liveData.emailAccounts, totalAccounts]);

  // Compute Active Warmup Mailbox Count
  const computedWarmupAccounts = useMemo(() => {
    if (!hasLiveSmartlead) return demoDashboard.summary.warmupAccounts;
    return liveData.emailAccounts.filter((acc) => {
      const warmup = asObject(acc.raw_data?.warmup_details);
      return getWarmupEnabled(warmup?.status) === true;
    }).length;
  }, [hasLiveSmartlead, liveData.emailAccounts]);

  // Compute Tag Aggregations across all accounts
  const tagBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const accounts = hasLiveSmartlead ? liveData.emailAccounts : [];
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
  }, [hasLiveSmartlead, liveData.emailAccounts]);

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/80 via-slate-50/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                Live Mission Control
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  hasLiveSmartlead
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : "bg-blue-50 text-blue-700 border-blue-200/80"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {hasLiveSmartlead ? "Live Production Sync" : "Interactive Simulation Mode"}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Clock className="w-3 h-3 text-slate-400" />
                Synced: {checkedAt}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Executive Outreach Operations
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Real-time monitoring across sending inboxes, deliverability health, active campaigns, and domain DNS compliance.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/issues"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 transition-all shadow-xs"
            >
              <TriangleAlert className="w-4 h-4 text-amber-500" />
              <span>Issues ({openIssues.length})</span>
              {criticalIssuesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white">
                  {criticalIssuesCount} crit
                </span>
              )}
            </Link>

            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>Settings & Rules</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Inboxes */}
        <Link
          href="/emailaccounts"
          className="group relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sending Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {totalAccounts.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Active inboxes</span>
              <span className="font-semibold text-indigo-600 group-hover:underline">
                Explore →
              </span>
            </div>
          </div>
        </Link>

        {/* Fleet Health & Compliance */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fleet Health
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <CircleCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
                {healthRate}%
              </span>
              <span className="text-xs font-bold text-emerald-600">Optimal</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>{healthy.toLocaleString()} compliant</span>
              <span className="text-emerald-700 font-semibold">Protected</span>
            </div>
          </div>
        </div>

        {/* Flagged / Attention Required */}
        <Link
          href="/issues"
          className="group relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Needs Attention
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-600 border border-amber-200/60 flex items-center justify-center transition-colors">
              <TriangleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  needAttention > 0 ? "text-amber-700" : "text-slate-900"
                }`}
              >
                {needAttention.toLocaleString()}
              </span>
              {criticalIssuesCount > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {criticalIssuesCount} crit
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Drift violations</span>
              <span className="font-semibold text-amber-600 group-hover:underline">
                Review →
              </span>
            </div>
          </div>
        </Link>

        {/* Active Campaigns */}
        <Link
          href="/campaigns"
          className="group relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 border border-indigo-200/60 flex items-center justify-center transition-colors">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {activeCampaignCount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Live sequences</span>
              <span className="font-semibold text-indigo-600 group-hover:underline">
                View →
              </span>
            </div>
          </div>
        </Link>

        {/* Domains Checked */}
        <Link
          href="/domains"
          className="group relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-cyan-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Domain Network
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 group-hover:bg-cyan-100 text-cyan-600 border border-cyan-200/60 flex items-center justify-center transition-colors">
              <Globe2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {totalDomains.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>SPF/DKIM/DMARC</span>
              <span className="font-semibold text-cyan-700 group-hover:underline">
                Audit →
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Fleet Volume & Velocity Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Daily Sending Capacity
            </span>
            <div className="text-2xl font-black tracking-tight text-white">
              {computedDailyCapacity.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-300">emails/day</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Combined fleet throughput cap across all accounts
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Active Warmup Fleet
            </span>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {computedWarmupAccounts.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {totalAccounts.toLocaleString()} inboxes
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {Math.round((computedWarmupAccounts / (totalAccounts || 1)) * 100)}% of total fleet actively exchanging warmup
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Connected Platforms
            </span>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {liveData.integrations.length}{" "}
              <span className="text-xs font-normal text-slate-500">workspaces</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {smartleadConnections.length} Smartlead · {emailguardConnections.length} EmailGuard
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
            <Server className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Operations Split Grid (Left: Workspaces & Breakdown, Right: Today's Executive Pulse) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segmented Workspaces & Fleet Explorer Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Header with Navigation Pills */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Sending Fleet & Platform Workspaces</span>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "infrastructure"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tag Mix
                </button>
              </div>
            </div>

            {/* Tab 1: Workspaces List */}
            {activeTab === "workspaces" && (
              <div className="p-5 space-y-4">
                {displayConnections.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No Smartlead workspaces connected yet.
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
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
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

                          <div className="flex items-center gap-2 self-start sm:self-auto">
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
                      <div key={tag.name} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
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

            {/* Workspaces Footer */}
            <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live Smartlead & EmailGuard API Sync Enabled
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
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Today&apos;s Operations Digest</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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

                {/* Rows of Daily Metrics */}
                <div className="space-y-1 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Inboxes audited
                    </span>
                    <span className="font-bold text-slate-900">
                      {todayCheckedAccounts.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                      Active campaigns
                    </span>
                    <span className="font-bold text-indigo-700">
                      {todayActiveCampaigns.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
                      Domains checked
                    </span>
                    <span className="font-bold text-slate-900">
                      {todayDomainsChecked.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <TriangleAlert className="w-3.5 h-3.5 text-amber-500" />
                      Open issues
                    </span>
                    <span
                      className={`font-bold ${
                        displayedNewIssues > 0 ? "text-amber-600" : "text-slate-900"
                      }`}
                    >
                      {displayedNewIssues.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Issues resolved
                    </span>
                    <span className="font-bold text-emerald-700">
                      {displayedResolved.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <Link
                href="/activity"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/50 transition-colors shadow-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>View Full Activity & Audit Log</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Operations Grid: Account Health Breakdown & Live Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Health Distribution Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
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

          <div className="space-y-3.5 pt-1">
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

        {/* Recent Detected Infrastructure Issues Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 flex flex-col justify-between">
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
