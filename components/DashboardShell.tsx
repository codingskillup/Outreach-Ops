"use client";

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

      name: "Smartlead Main",

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

      name: "Smartlead 2",

      clients: ["Reverba"],

      accounts: 550,

      tagDistribution: [
        { name: "Hypertide Azure/Entra", count: 520 },
        { name: "Hypertide Google", count: 30 },
        { name: "Google Workspace", count: 0 },
      ],

      activeCampaigns: 14,

      status: "connected",

      lastSynced: null,
    },
  ] satisfies ConnectionDisplay[],

  recentIssues: [
    {
      title: "Daily limit needs attention",

      description:
        "Some sending accounts are using a daily limit different from the required account type setting.",
    },

    {
      title: "Warmup settings issue",

      description:
        "Some accounts have incorrect warmup settings and need review.",
    },

    {
      title: "EmailGuard domain issue",

      description: "A domain health check requires attention.",
    },
  ],
};

export default function DashboardShell({
  liveData,
}: {
  liveData: DashboardLiveData;
}) {
  const smartleadConnections = liveData.integrations.filter(
    (integration) => integration.provider === "smartlead",
  );

  /*

    * Once any real integration exists, never fall back to demo metrics.

    * This prevents fake demo values from appearing while a real

    * provider is connected but currently has zero synced rows.

    */

  const hasLiveSmartlead = smartleadConnections.length > 0;

  /*

    * Smartlead returns child / subsequence campaigns too.

    * The main Smartlead campaign UI does not count them as

    * separate campaigns, so dashboard metrics use main campaigns only.

    */

  const mainCampaigns = liveData.campaigns.filter(isMainCampaign);

  const activeCampaigns = mainCampaigns.filter(
    (campaign) => normalizeStatus(campaign.status) === "ACTIVE",
  );

  const enabledRuleMap = buildEnabledRuleMap(liveData.accountRules);

  const accountHealthStatuses = liveData.emailAccounts.map((account) =>
    getAccountHealthStatus(account, enabledRuleMap),
  );

  const healthyAccounts = accountHealthStatuses.filter(
    (status) => status === "healthy",
  ).length;

  const attentionAccounts = accountHealthStatuses.filter(
    (status) => status === "attention",
  ).length;

  const notEvaluatedAccounts = accountHealthStatuses.filter(
    (status) => status === "not_evaluated",
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
    (issue) => issue.status === "Resolved",
  );

  const recentOpenIssues = openIssues.slice(0, 4);

  const latestSync =
    liveData.syncLogs.find((log) => log.status === "success") ||
    liveData.syncLogs[0] ||
    null;

  const latestSmartleadLogs = getLatestIntegrationLogs(
    liveData.syncLogs,

    "smartlead",
  );

  const latestEmailGuardLogs = getLatestIntegrationLogs(
    liveData.syncLogs,

    "emailguard",
  );

  const displayConnections: ConnectionDisplay[] = hasLiveSmartlead
    ? smartleadConnections.map((connection) =>
        buildLiveConnection(
          connection,

          liveData.emailAccounts,

          mainCampaigns,
        ),
      )
    : demoDashboard.smartleadConnections;

  const todayCheckedAccounts = hasLiveSmartlead
    ? latestSmartleadLogs.length > 0
      ? latestSmartleadLogs.reduce(
          (total, log) => total + log.accounts_fetched,

          0,
        )
      : totalAccounts
    : demoDashboard.todaysUpdate.checkedAccounts;

  /*

    * Use current main-campaign data instead of a sync-log snapshot.

    * This prevents EmailGuard logs or old child-campaign counts from

    * making Today's Update disagree with the Campaigns page.

    */

  const todayActiveCampaigns = hasLiveSmartlead
    ? activeCampaignCount
    : demoDashboard.todaysUpdate.activeCampaigns;

  const todayDomainsChecked = hasLiveSmartlead
    ? latestEmailGuardLogs.length > 0
      ? latestEmailGuardLogs.reduce(
          (total, log) => total + log.domains_fetched,

          0,
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

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Top Welcome & Operational Status Bar */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Operations Center
            </span>

            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                hasLiveSmartlead
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {hasLiveSmartlead
                ? "Live Production Sync"
                : "Simulation Demo Mode"}
            </span>
          </div>

          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time mailbox configuration, sender volume velocity, and domain
            infrastructure health.
          </p>
        </div>

        {/* Quick Action Shortcuts */}

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/issues"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors"
          >
            <TriangleAlert className="w-3.5 h-3.5 text-amber-500" />

            <span>Audit Issues ({openIssues.length})</span>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />

            <span>Manage Integrations</span>
          </Link>
        </div>
      </div>

      {/* 5 Elevated Hero Metric KPI Cards */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Email Accounts */}

        <Link
          href="/emailaccounts"
          className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Email Accounts
            </span>

            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {totalAccounts.toLocaleString()}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5">
              Active sending mailboxes
            </p>
          </div>
        </Link>

        {/* Healthy Accounts */}

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-emerald-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Healthy Mailboxes
            </span>

            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CircleCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">
              {healthy.toLocaleString()}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-bold text-emerald-600">
                {healthRate}%
              </span>
              <span className="text-[11px] text-slate-400">
                {hasLiveSmartlead
                  ? notEvaluatedAccounts > 0
                    ? `${notEvaluatedAccounts.toLocaleString()} not evaluated`
                    : "of evaluated accounts"
                  : "optimal settings"}
              </span>
            </div>
          </div>
        </div>

        {/* Need Attention */}

        <Link
          href="/issues"
          className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Needs Attention
            </span>

            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TriangleAlert className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700">
              {needAttention.toLocaleString()}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-amber-700 transition-colors">
              <span>View flagged accounts</span>

              <ArrowRight className="w-2.5 h-2.5" />
            </p>
          </div>
        </Link>

        {/* Active Campaigns */}

        <Link
          href="/campaigns"
          className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Campaigns
            </span>

            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-950">
              {activeCampaignCount.toLocaleString()}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5">
              Live dispatch sequences
            </p>
          </div>
        </Link>

        {/* Domains */}

        <Link
          href="/domains"
          className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-cyan-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Domains Monitored
            </span>

            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Globe2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {totalDomains.toLocaleString()}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5">
              DNS & reputation checked
            </p>
          </div>
        </Link>
      </div>

      {/* Primary Operations Grid (Workspaces & Today's Pulse) */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Smartlead Workspaces (Span 2) */}

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />

                  <span>Smartlead Connected Workspaces</span>
                </h3>

                <p className="text-xs text-slate-400 mt-0.5">
                  {hasLiveSmartlead
                    ? "Live synchronized sending accounts by provider"
                    : "Simulated sending account breakdown"}
                </p>
              </div>

              <Link
                href="/settings"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Connections</span>

                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Workspaces List */}

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
                      className="rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 overflow-hidden"
                    >
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
                            <Server className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {connection.name}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Users className="w-3 h-3 text-slate-400" />

                              <span>{formatClients(connection.clients)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isConnected
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <Wifi className="w-2.5 h-2.5" />

                            {isConnected ? "Connected" : connection.status}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Mailbox Tag Breakdown */}
                      <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white text-center py-2.5 px-1 text-xs">
                        <div className="p-2 min-w-[120px] flex-1">
                          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Total Accounts
                          </span>
                          <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                            {connection.accounts.toLocaleString()}
                          </span>
                        </div>

                        {connection.tagDistribution.map((tag) => (
                          <div
                            key={`${connection.id}-${tag.name}`}
                            className="p-2 min-w-[140px] flex-1"
                          >
                            <span
                              className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate"
                              title={tag.name}
                            >
                              {tag.name}
                            </span>
                            <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                              {tag.count.toLocaleString()}
                            </span>
                          </div>
                        ))}

                        <div className="p-2 min-w-[120px] flex-1">
                          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Campaigns
                          </span>
                          <span className="text-sm font-bold text-indigo-700 mt-0.5 block">
                            {connection.activeCampaigns.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {connection.lastSynced && (
                        <div className="p-2 px-4 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>
                            Last synchronized:{" "}
                            {formatDateTime(connection.lastSynced)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Synchronized with Smartlead API engine</span>

            <Link
              href="/emailaccounts"
              className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1"
            >
              <span>View all mailboxes</span>

              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Today's Pulse / Executive Digest (Span 1) */}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />

                  <span>Today&apos;s Update</span>
                </h3>

                <p className="text-xs text-slate-400 mt-0.5">
                  Last pipeline check: {checkedAt}
                </p>
              </div>
            </div>

            {/* Health Meter Widget */}

            <div className="p-5 pb-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700">
                    Mailbox Health Score
                  </span>

                  <span className="font-bold text-emerald-600">
                    {healthRate}% Optimal
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${healthRate}%` }}
                  />
                </div>
              </div>

              {/* Rows */}

              <div className="space-y-1 divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Accounts audited</span>

                  <span className="font-bold text-slate-900">
                    {todayCheckedAccounts.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Active campaigns</span>

                  <span className="font-bold text-indigo-700">
                    {todayActiveCampaigns.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Domains checked</span>

                  <span className="font-bold text-slate-900">
                    {todayDomainsChecked.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Open issues</span>

                  <span
                    className={`font-bold ${
                      displayedNewIssues > 0
                        ? "text-amber-600"
                        : "text-slate-900"
                    }`}
                  >
                    {displayedNewIssues.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Issues resolved</span>

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
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-indigo-200/80 bg-white hover:bg-indigo-50/40 transition-colors shadow-sm"
            >
              <Activity className="w-3.5 h-3.5" />

              <span>View Full Pipeline Activity Log</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Operations Grid (Account Health & Recent Issues) */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Health Distribution */}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />

                <span>Account Health Breakdown</span>
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Distribution of mailbox rules and compliance
              </p>
            </div>

            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {healthRate}% Compliant
            </span>
          </div>

          <div className="space-y-3">
            <HealthProgressBar
              label="Optimal Settings"
              value={healthy}
              total={totalAccounts}
              color="emerald"
            />

            <HealthProgressBar
              label="Needs Review"
              value={needAttention}
              total={totalAccounts}
              color="amber"
            />

            {hasLiveSmartlead && (
              <HealthProgressBar
                label="Not Evaluated"
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
                  label="Warmup Setting Issues"
                  value={demoDashboard.accountHealth.warmupIssues}
                  total={totalAccounts}
                  color="orange"
                />

                <HealthProgressBar
                  label="Disconnected Accounts"
                  value={demoDashboard.accountHealth.connectionIssues}
                  total={totalAccounts}
                  color="rose"
                />
              </>
            )}
          </div>
        </div>

        {/* Recent Detected Issues */}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 flex flex-col justify-between">
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
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>All Issues</span>

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
                        className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex items-start gap-3 group"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isCritical
                              ? "bg-rose-100 text-rose-600"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <CircleAlert className="w-3.5 h-3.5" />
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
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CircleAlert className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {issue.title}
                      </span>

                      <p className="text-slate-500 line-clamp-1 mt-0.5">
                        {issue.description}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <Link
            href="/issues"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Run Deep Diagnostic Scan</span>

            <ArrowRight className="w-3 h-3" />
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

      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
  allCampaigns: Campaign[],
): ConnectionDisplay {
  const accounts = allAccounts.filter(
    (account) => account.integration_id === connection.id,
  );

  const campaigns = allCampaigns.filter(
    (campaign) =>
      campaign.integration_id === connection.id && isMainCampaign(campaign),
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
    (campaign) => normalizeStatus(campaign.status) === "ACTIVE",
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

  campaigns: Campaign[],
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

function getLatestIntegrationLogs(
  logs: SyncLog[],

  provider: string,
) {
  const latestByIntegration = new Map<string, SyncLog>();

  const providerLogs = logs

    .filter((log) => log.provider === provider && log.status === "success")

    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
  enabledRuleMap: Map<string, AccountTypeRule>,
): AccountHealthStatus {
  const raw = account.raw_data || {};
  const warmupDetails = asObject(raw.warmup_details);

  const matchedRules = getAccountTags(raw)
    .map((tag) =>
      enabledRuleMap.get(ruleMapKey(account.integration_id, tag.key)),
    )
    .filter((rule): rule is AccountTypeRule => Boolean(rule));

  if (matchedRules.length === 0) {
    return "not_evaluated";
  }

  const checks = [
    evaluateRuleField(
      getNumber(raw.message_per_day),
      matchedRules.map((rule) => rule.message_per_day),
    ),

    evaluateRuleField(
      getNumber(raw.minTimeToWaitInMins),
      matchedRules.map((rule) => rule.minimum_gap),
    ),

    evaluateRuleField(
      getWarmupEnabled(warmupDetails.status),
      matchedRules.map((rule) => rule.warmup_enabled),
    ),

    evaluateRuleField(
      getNumber(warmupDetails.max_email_per_day) ??
        getNumber(warmupDetails.warmup_max_count),
      matchedRules.map((rule) => rule.warmup_daily),
    ),

    evaluateRuleField(
      getNumber(warmupDetails.reply_rate),
      matchedRules.map((rule) => rule.reply_rate),
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
  expectedValues: Array<T | null>,
) {
  const configuredValues = expectedValues.filter(
    (value): value is T => value !== null,
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
  /*



   * Keep this deterministic so server and client render



   * the exact same text during hydration.



   */

  return formatDateTime(value);
}
