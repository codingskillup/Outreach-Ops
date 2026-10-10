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
import { cleanClientName } from "@/lib/utils";

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
  clientBreakdown: {
    name: string;
    count: number;
  }[];
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

  // Selected Scope: "ALL" for all combined, or a specific workspace/client name
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
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
    fetch("/api/issues/scan", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("outreach:refresh"));
        }
        router.refresh();
        setTimeout(() => {
          setIsRefreshing(false);
          showToast("Fleet telemetry updated across all connected Smartlead workspaces.");
        }, 800);
      });
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

  const [workspaceRuleTab, setWorkspaceRuleTab] = useState<string>("ALL");

  // Distinct workspaces represented in scopedRules
  const ruleWorkspaces = useMemo(() => {
    const wsMap = new Map<string, { id: string; name: string; count: number }>();
    for (const rule of scopedRules) {
      const wsName = integrationNameMap.get(rule.integration_id) || "Smartlead";
      const existing = wsMap.get(rule.integration_id);
      if (existing) {
        existing.count += 1;
      } else {
        wsMap.set(rule.integration_id, {
          id: rule.integration_id,
          name: wsName,
          count: 1,
        });
      }
    }
    return Array.from(wsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedRules, integrationNameMap]);

  // Helper to count accounts matching a specific rule's workspace and tag
  const getRuleMatchedCount = useMemo(() => {
    const cache = new Map<string, number>();
    for (const rule of scopedRules) {
      const count = safeEmailAccounts.filter((acc) => {
        if (acc.integration_id && acc.integration_id !== rule.integration_id) return false;
        const raw = acc.raw_data || {};
        const tags = getAccountTags(raw);
        const ruleTagLower = (rule.tag_name || "").trim().toLowerCase();
        const matchesTag = tags.some(
          (t) =>
            t.key === rule.tag_key ||
            t.name.trim().toLowerCase() === ruleTagLower
        );
        if (matchesTag) return true;
        const accType = getText(acc.account_type) || getText(raw.account_type);
        if (accType && accType.trim().toLowerCase() === ruleTagLower) return true;
        return false;
      }).length;
      cache.set(rule.id, count);
    }
    return (ruleId: string) => cache.get(ruleId) ?? 0;
  }, [scopedRules, safeEmailAccounts]);


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

  const renderRuleCard = (rule: AccountTypeRule, workspaceName: string) => {
    const isGoogle =
      (rule.tag_name || "").toLowerCase().includes("google") ||
      (rule.tag_name || "").toLowerCase().includes("gmail");
    const isAzure =
      (rule.tag_name || "").toLowerCase().includes("azure") ||
      (rule.tag_name || "").toLowerCase().includes("entra") ||
      (rule.tag_name || "").toLowerCase().includes("microsoft") ||
      (rule.tag_name || "").toLowerCase().includes("outlook");

    const matchedCount = getRuleMatchedCount(rule.id);

    return (
      <div
        key={rule.id}
        className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all p-3 sm:p-3.5 flex flex-col justify-between group"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                isGoogle
                  ? "bg-amber-50 text-amber-600 border-amber-200/60"
                  : isAzure
                  ? "bg-blue-50 text-blue-600 border-blue-200/60"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200/60"
              }`}
            >
              {isGoogle ? (
                <Mail className="w-3.5 h-3.5 text-amber-600" />
              ) : isAzure ? (
                <Server className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-[12px] sm:text-[13px] font-bold text-slate-900 truncate">
                  {rule.tag_name || "General"}
                </h4>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60 uppercase tracking-wider shrink-0">
                  {workspaceName}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-700">{matchedCount.toLocaleString()}</span> inboxes
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Enforced
          </span>
        </div>

        {/* 4 Guardrail Metrics (Tight 2x2 Grid) */}
        <div className="grid grid-cols-2 gap-1.5 my-2">
          {/* Metric 1: Daily Cap */}
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/70 border border-slate-100/90 hover:bg-amber-50/20 hover:border-amber-200/70 transition-colors">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-amber-500" />
              Daily Cap
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {rule.message_per_day != null ? rule.message_per_day : "∞"}
              </span>
              <span className="text-[9px] text-slate-400 font-normal">
                {rule.message_per_day != null ? "msgs" : "Uncapped"}
              </span>
            </div>
          </div>

          {/* Metric 2: Minimum Gap */}
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/70 border border-slate-100/90 hover:bg-blue-50/20 hover:border-blue-200/70 transition-colors">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-blue-500" />
              Min Gap
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {rule.minimum_gap != null ? rule.minimum_gap : "0"}
              </span>
              <span className="text-[9px] text-slate-400 font-normal">
                {rule.minimum_gap != null ? (rule.minimum_gap === 1 ? "min" : "mins") : "None"}
              </span>
            </div>
          </div>

          {/* Metric 3: Warmup Cap */}
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/70 border border-slate-100/90 hover:bg-emerald-50/20 hover:border-emerald-200/70 transition-colors">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
              Warmup
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {rule.warmup_enabled === false
                  ? "Off"
                  : rule.warmup_daily != null
                  ? rule.warmup_daily
                  : "∞"}
              </span>
              <span className="text-[9px] text-slate-400 font-normal">
                {rule.warmup_enabled === false ? "Off" : rule.warmup_daily != null ? "msgs" : "Uncapped"}
              </span>
            </div>
          </div>

          {/* Metric 4: Reply Target */}
          <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/70 border border-slate-100/90 hover:bg-purple-50/20 hover:border-purple-200/70 transition-colors">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-purple-500" />
              Reply
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {rule.reply_rate != null ? `${rule.reply_rate}%` : "—"}
              </span>
              <span className="text-[9px] text-slate-400 font-normal">
                {rule.reply_rate != null ? "min" : "None"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href={`/emailaccounts?search=${encodeURIComponent(rule.tag_name || "")}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View {matchedCount.toLocaleString()} Inboxes</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/settings"
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Configure →
          </Link>
        </div>
      </div>
    );
  };

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
      {/* ── Executive Command Header (Soft, Luxury Executive Design) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Title & Live Badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200/80">
                <Radio className="w-3 h-3 text-[#2563EB] animate-pulse" />
                OUTREACH OPS v3.0
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  hasLiveSmartlead
                    ? "bg-emerald-50 text-[#10B981] border-emerald-200/80"
                    : "bg-slate-50 text-slate-700 border-slate-200/80"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasLiveSmartlead ? "bg-[#10B981]" : "bg-slate-400"
                  }`}
                />
                {hasLiveSmartlead ? "Production Sync Live" : "Awaiting API Connection"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
                <Clock className="w-3 h-3 text-slate-400" />
                Audited: {checkedAt}
              </span>
            </div>

            <h1 className="text-[26px] font-semibold text-slate-900 tracking-tight leading-tight">
              Fleet Operations & Deliverability Command
            </h1>
            <p className="text-[14px] font-normal text-slate-500 mt-1 max-w-3xl">
              Real-time surveillance across sending mailboxes, warmup pacing, sequences, and DNS compliance.
            </p>
          </div>

          {/* Right: Quick Action Controls (Buttons: 500, 14px) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200/90 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Trigger instant sync across all connected APIs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? "animate-spin text-[#2563EB]" : "text-slate-400"
                }`}
              />
              <span>{isRefreshing ? "Syncing..." : "Sync Fleet"}</span>
            </button>

            <Link
              href="/issues"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all shadow-2xs"
            >
              <TriangleAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Issues</span>
              {openIssues.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#EF4444] text-white">
                  {openIssues.length}
                </span>
              )}
            </Link>

            <Link
              href="/connections"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 transition-all shadow-2xs"
            >
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>{displayConnections.length} Smartleads</span>
            </Link>

            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-all shadow-xs active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Rules & Limits</span>
            </Link>
          </div>
        </div>
      </div>


      {/* ── Dedicated Connected Smartlead Workspaces Cards (Both Smartleads Visible Side-by-Side) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Server className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#14243D] flex items-center gap-2">
                <span>Connected Smartlead Accounts</span>
                <span className="px-2 py-0.5 rounded-full text-[12px] font-normal bg-blue-50 text-[#2563EB] border border-blue-200">
                  {displayConnections.length} Active Workspaces
                </span>
              </h2>
              <p className="text-[12px] font-normal text-slate-500">
                Independent Smartlead workspace synchronizations and mailbox allocations
              </p>
            </div>
          </div>

          {selectedScope !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedScope("ALL")}
              className="text-[14px] font-medium text-[#2563EB] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
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
            <h4 className="text-[16px] font-semibold text-[#14243D]">
              No Smartlead accounts connected yet
            </h4>
            <p className="text-[12px] font-normal text-slate-500 max-w-md mx-auto">
              Add your Smartlead API key in Settings to sync mailboxes, campaigns, and deliverability rules.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-medium bg-[#2563EB] text-white hover:bg-blue-700 transition-colors"
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
              const warmupPct =
                conn.accounts > 0
                  ? Math.round((conn.warmupAccounts / conn.accounts) * 100)
                  : 0;

              return (
                <div
                  key={conn.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-2xs ${
                    isFocused
                      ? "ring-2 ring-[#2563EB]/40 border-[#2563EB] shadow-md"
                      : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* Clean Executive Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                          <Server className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[16px] font-semibold text-[#14243D] truncate flex items-center gap-2">
                            <span>{conn.name}</span>
                            {isFocused && (
                              <span className="px-2 py-0.5 rounded-full text-[12px] font-normal bg-[#2563EB] text-white">
                                Focused
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-normal text-slate-500 mt-0.5">
                            {conn.accounts.toLocaleString()} total mailboxes connected
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-normal border ${
                            isConnected
                              ? "bg-emerald-50 text-[#10B981] border-emerald-200"
                              : "bg-amber-50 text-[#F59E0B] border-amber-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isConnected ? "bg-[#10B981]" : "bg-[#F59E0B]"
                            }`}
                          />
                          {isConnected ? "Live Sync Active" : conn.status}
                        </span>
                      </div>
                    </div>

                    {/* Client Portfolios with exact account counts */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-normal text-slate-400 flex items-center gap-1 mr-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Clients:</span>
                      </span>
                      {conn.clientBreakdown.length === 0 ? (
                        <span className="text-[12px] text-slate-400 italic">
                          No clients assigned
                        </span>
                      ) : (
                        conn.clientBreakdown.map((c) => (
                          <span
                            key={c.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-normal bg-[#F4F7FB] text-slate-700 border border-slate-200/90"
                          >
                            <span className="font-medium text-slate-900">{c.name}:</span>
                            <span className="font-semibold text-[#2563EB] tabular-nums">
                              {c.count.toLocaleString()} inboxes
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 4 Metric Columns in Crisp White with Warmup Progress Line */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-center py-2.5 sm:py-3 px-1 bg-white">
                    <div className="p-2 sm:p-2.5">
                      <span className="block text-[12px] font-normal text-slate-500 uppercase tracking-wider">
                        Inboxes
                      </span>
                      <span className="text-[28px] font-semibold text-[#14243D] mt-0.5 block tabular-nums">
                        {conn.accounts.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400 mt-0.5 block">
                        Total Synced
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5">
                      <span className="block text-[12px] font-normal text-slate-500 uppercase tracking-wider">
                        Campaigns
                      </span>
                      <span className="text-[28px] font-semibold text-[#8B5CF6] mt-0.5 block tabular-nums">
                        {conn.activeCampaigns.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400 mt-0.5 block">
                        Active Sequences
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5">
                      <span className="block text-[12px] font-normal text-slate-500 uppercase tracking-wider">
                        Daily Bandwidth
                      </span>
                      <span className="text-[28px] font-semibold text-[#F59E0B] mt-0.5 block tabular-nums">
                        {conn.dailyCapacity.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400 mt-0.5 block">
                        Emails / day
                      </span>
                    </div>

                    {/* Warmup with Progress Bar & 100% Guarded line */}
                    <div className="p-2 sm:p-2.5 text-left px-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="block text-[12px] font-normal text-slate-500 uppercase tracking-wider">
                            Warmup
                          </span>
                          <span className="text-[12px] font-medium text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 tabular-nums">
                            {warmupPct}%
                          </span>
                        </div>
                        <span className="text-[28px] font-semibold text-[#10B981] mt-0.5 block tabular-nums">
                          {conn.warmupAccounts.toLocaleString()}
                        </span>
                      </div>

                      {/* Visual Warmup Progress Line */}
                      <div className="mt-1">
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                            style={{ width: `${warmupPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-normal text-[#10B981] mt-0.5 block">
                          {warmupPct === 100
                            ? "100% In Warmup"
                            : `${conn.warmupAccounts} of ${conn.accounts} in warmup`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags / Providers Breakdown (Hypertide Azure vs Google exact counts) */}
                  <div className="p-3 sm:px-4 bg-[#F4F7FB]/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-normal text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                        <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Providers & Tags:</span>
                      </span>
                      {conn.tagDistribution.length === 0 ? (
                        <span className="text-[12px] text-slate-400 italic">
                          No tags detected
                        </span>
                      ) : (
                        conn.tagDistribution.map((t) => {
                          const isGoogle = t.name.toLowerCase().includes("google");
                          const isAzure =
                            t.name.toLowerCase().includes("azure") ||
                            t.name.toLowerCase().includes("entra");

                          return (
                            <span
                              key={t.name}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-normal border transition-colors ${
                                isGoogle
                                  ? "bg-purple-50/90 text-purple-900 border-purple-200"
                                  : isAzure
                                  ? "bg-blue-50/90 text-blue-900 border-blue-200"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              <span className="font-medium">{t.name}:</span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  isGoogle
                                    ? "text-[#8B5CF6]"
                                    : isAzure
                                    ? "text-[#2563EB]"
                                    : "text-slate-900"
                                }`}
                              >
                                {t.count.toLocaleString()}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Link
                        href="/emailaccounts"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2563EB] hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/60 transition-colors"
                      >
                        <span>Inboxes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Operational Command & Fleet Surveillance (Clean 2-Column Balanced Hub) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Today's Operations Digest & Compliance Health */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#14243D] flex items-center gap-2">
                    <span>Today&apos;s Operations Digest</span>
                  </h3>
                  <p className="text-[12px] font-normal text-slate-500 mt-0.5">
                    Checked at: {checkedAt} · Real-time fleet health audit
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-normal bg-emerald-50 text-[#10B981] border border-emerald-200 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>{healthRate}% Optimal</span>
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Fleet Health Index Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#F4F7FB] to-emerald-50/40 border border-slate-200/80">
                <div className="flex items-center justify-between text-[13px] font-normal mb-2">
                  <span className="font-semibold text-slate-800">
                    Fleet Health Index
                  </span>
                  <span className="font-semibold text-[#10B981] tabular-nums">
                    {healthRate}% Optimal
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                    style={{ width: `${healthRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[12px] font-normal text-slate-500 mt-2">
                  <span>{healthy.toLocaleString()} compliant mailboxes</span>
                  <span>{needAttention.toLocaleString()} drift flagged</span>
                </div>
              </div>

              {/* Status explanation strip */}
              <div className="p-3.5 rounded-xl bg-[#F4F7FB]/70 border border-slate-200/70 flex items-start gap-2.5">
                {openIssues.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                ) : (
                  <CircleAlert className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                )}
                <div className="text-[12px] font-normal text-slate-600 leading-relaxed">
                  {openIssues.length === 0 ? (
                    <span>
                      All monitored mailboxes comply with active sending limits and warmup rules. Zero drift detected across connected Smartlead workspaces.
                    </span>
                  ) : (
                    <span>
                      {criticalIssuesCount > 0 ? `${criticalIssuesCount} critical violations and ` : ""}
                      {openIssues.length} drift anomalies detected. Review the issues queue to maintain deliverability reputation.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[12px] font-normal text-slate-400">
              Audit trail & event telemetry
            </span>
            <Link
              href="/activity"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-medium text-[#2563EB] hover:text-blue-800 hover:bg-blue-50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>View Full Activity Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Live Operations Telemetry */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#14243D] flex items-center gap-2">
                    <span>Live Operations Telemetry</span>
                  </h3>
                  <p className="text-[12px] font-normal text-slate-500 mt-0.5">
                    Synchronized metrics across Smartlead & EmailGuard APIs
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-normal bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                <span>Active Fleet</span>
              </span>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3">
              {/* Tile 1: Inboxes Audited */}
              <Link
                href="/emailaccounts"
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="mt-3">
                  <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500 block">
                    Inboxes Audited
                  </span>
                  <div className="text-[28px] font-semibold text-[#14243D] mt-0.5 tabular-nums">
                    {todayCheckedAccounts.toLocaleString()}
                  </div>
                  <span className="text-[12px] font-normal text-slate-400 mt-0.5 block truncate">
                    Across {displayConnections.length} Smartleads
                  </span>
                </div>
              </Link>

              {/* Tile 2: Active Sequences */}
              <Link
                href="/campaigns"
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-purple-300 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#8B5CF6] flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="mt-3">
                  <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500 block">
                    Live Campaigns
                  </span>
                  <div className="text-[28px] font-semibold text-[#8B5CF6] mt-0.5 tabular-nums">
                    {todayActiveCampaigns.toLocaleString()}
                  </div>
                  <span className="text-[12px] font-normal text-slate-400 mt-0.5 block truncate">
                    Active sequence flows
                  </span>
                </div>
              </Link>

              {/* Tile 3: Domains Monitored */}
              <Link
                href="/domains"
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="mt-3">
                  <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500 block">
                    Domains Monitored
                  </span>
                  <div className="text-[28px] font-semibold text-[#14243D] mt-0.5 tabular-nums">
                    {todayDomainsChecked.toLocaleString()}
                  </div>
                  <span className="text-[12px] font-normal text-slate-400 mt-0.5 block truncate">
                    EmailGuard DNS verified
                  </span>
                </div>
              </Link>

              {/* Tile 4: Issues Resolved */}
              <Link
                href="/issues"
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="mt-3">
                  <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500 block">
                    Issues Resolved
                  </span>
                  <div className="text-[28px] font-semibold text-[#10B981] mt-0.5 tabular-nums">
                    {displayedResolved.toLocaleString()}
                  </div>
                  <span className="text-[12px] font-normal text-slate-400 mt-0.5 block truncate">
                    {displayedNewIssues > 0 ? `${displayedNewIssues} open drift issues` : "0 open anomalies"}
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] font-normal text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              Automated drift check active
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-medium text-[#2563EB] hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Scanning..." : "Audit Pipeline Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Enforced Deliverability Rules (Full-Width Operations Stage) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-5 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70">
                <SlidersHorizontal className="w-2.5 h-2.5 text-blue-600" />
                Deliverability Guardrails
              </span>
              {scopedRules.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {scopedRules.length} Active {scopedRules.length === 1 ? "Rule" : "Rules"}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Enforced Deliverability Rules by Tag
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
              Threshold guardrails configured in Settings to prevent mailbox drift, daily cap breaches, and warmup decay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Segmented Workspace Tabs */}
            {ruleWorkspaces.length > 1 && (
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setWorkspaceRuleTab("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    workspaceRuleTab === "ALL"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3 h-3 text-blue-600" />
                  <span>All</span>
                  <span
                    className={`text-[9px] px-1 rounded-full font-bold ${
                      workspaceRuleTab === "ALL"
                        ? "bg-slate-100 text-slate-800"
                        : "bg-slate-200/60 text-slate-600"
                    }`}
                  >
                    {scopedRules.length}
                  </span>
                </button>
                {ruleWorkspaces.map((ws) => {
                  const isSelected = workspaceRuleTab === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setWorkspaceRuleTab(ws.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Server
                        className={`w-3 h-3 ${
                          isSelected ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                      <span>{ws.name}</span>
                      <span
                        className={`text-[9px] px-1 rounded-full font-bold ${
                          isSelected
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-200/60 text-slate-600"
                        }`}
                      >
                        {ws.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
              <span>Configure</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Rules Cards Body - All 4 Cards in 1 Row */}
        {scopedRules.length > 0 ? (
          <div>
            {(() => {
              const displayRules =
                workspaceRuleTab === "ALL"
                  ? scopedRules
                  : scopedRules.filter((r) => r.integration_id === workspaceRuleTab);

              return (
                <div
                  className={`grid gap-3 ${
                    displayRules.length >= 4
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      : displayRules.length === 3
                      ? "grid-cols-1 sm:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2 max-w-4xl"
                  }`}
                >
                  {displayRules.map((rule) => {
                    const wsName = integrationNameMap.get(rule.integration_id) || "Smartlead";
                    return renderRuleCard(rule, wsName);
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-8 text-center space-y-3 bg-[#F4F7FB]/50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto shadow-2xs">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[16px] font-semibold text-[#14243D]">
                No Deliverability Rules Configured Yet
              </h4>
              <p className="text-[12px] font-normal text-slate-400 mt-1 max-w-md mx-auto">
                Configure your daily limits, minimum gaps, and warmup targets in Settings to activate automated drift surveillance.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium text-white bg-[#2563EB] hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/25 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure Deliverability Rules Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Operations Launchpad (v3) ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-[12px] font-normal uppercase tracking-wider text-slate-400">
              Quick Operations Launchpad
            </h4>
            <p className="text-[16px] font-semibold text-[#14243D] mt-0.5">
              Direct access across core outreach operational modules
            </p>
          </div>
          <div className="text-[12px] font-normal text-slate-400">
            Click any module to jump directly to live records
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/emailaccounts"
            className="p-3.5 rounded-xl bg-[#F4F7FB]/70 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate group-hover:text-[#2563EB] transition-colors">
                Email Accounts
              </div>
              <div className="text-[12px] font-normal text-slate-400 truncate">
                Limits & warmup
              </div>
            </div>
          </Link>

          <Link
            href="/campaigns"
            className="p-3.5 rounded-xl bg-[#F4F7FB]/70 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-[#8B5CF6] group-hover:bg-[#8B5CF6] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate group-hover:text-[#8B5CF6] transition-colors">
                Campaigns
              </div>
              <div className="text-[12px] font-normal text-slate-400 truncate">
                Active sequences
              </div>
            </div>
          </Link>

          <Link
            href="/domains"
            className="p-3.5 rounded-xl bg-[#F4F7FB]/70 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate group-hover:text-[#2563EB] transition-colors">
                Domain Network
              </div>
              <div className="text-[12px] font-normal text-slate-400 truncate">
                DNS, SPF & DMARC
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="p-3.5 rounded-xl bg-[#F4F7FB]/70 hover:bg-amber-50/50 border border-slate-200/70 hover:border-amber-300 text-slate-800 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-[#F59E0B] group-hover:bg-[#F59E0B] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate group-hover:text-amber-700 transition-colors">
                Account Rules
              </div>
              <div className="text-[12px] font-normal text-slate-400 truncate">
                Drift & limits
              </div>
            </div>
          </Link>

          <Link
            href="/notes"
            className="p-3.5 rounded-xl bg-[#F4F7FB]/70 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 text-slate-800 transition-all flex items-center gap-3 group sm:col-span-2 md:col-span-1"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate group-hover:text-[#10B981] transition-colors">
                Ops Notes & Log
              </div>
              <div className="text-[12px] font-normal text-slate-400 truncate">
                Team notes & audit
              </div>
            </div>
          </Link>
        </div>
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

  const clientCounts = new Map<string, number>();
  for (const account of accounts) {
    const clientName = getAccountClient(account);
    clientCounts.set(clientName, (clientCounts.get(clientName) || 0) + 1);
  }
  for (const camp of campaigns) {
    const clientName = getCampaignClient(camp);
    if (!clientCounts.has(clientName)) {
      clientCounts.set(clientName, 0);
    }
  }

  const clientBreakdown = Array.from(clientCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const clients = clientBreakdown.map((c) => c.name);

  return {
    id: connection.id,
    name: connection.name,
    clients,
    clientBreakdown,
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
  return cleanClientName(
    getText(raw.client_name) ||
    getText(raw.clientName) ||
    getText(raw.client) ||
    "Unassigned"
  );
}

function getCampaignClient(campaign: Campaign): string {
  const raw = campaign.raw_data || {};
  return cleanClientName(
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
