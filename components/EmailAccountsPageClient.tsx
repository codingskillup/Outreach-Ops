"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertCircle,
  Tag as TagIcon,
  Filter,
  Eye,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import { cleanClientName } from "@/lib/utils";

type RawData = Record<string, unknown>;

export type AccountTag = {
  key: string;
  name: string;
};

export type RealAccount = {
  id: string;
  external_id: number;
  email: string | null;
  from_name: string | null;
  username: string | null;
  account_type: string | null;
  raw_data: RawData | null;
  synced_at: string;
  integration_id: string;
  integrations:
    | {
        id: string;
        name: string;
        provider: string;
      }
    | {
        id: string;
        name: string;
        provider: string;
      }[]
    | null;
};

export type EmailAccountRule = {
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

export type DisplayAccount = {
  id: string;
  externalId: number;
  integrationId: string;
  email: string;
  fromName: string | null;
  client: string;
  smartlead: string;
  tags: AccountTag[];
  dailyLimit: number | null;
  minimumGap: number | null;
  warmupEnabled: boolean | null;
  warmupDaily: number | null;
  reputation: number | null;
  bounceRate: number | null;
  replyRate: number | null;
  syncedAt: string;
};

export type HealthStatus = "healthy" | "attention" | "not_evaluated";

export type FieldEvaluation<T> = {
  configured: boolean;
  conflict: boolean;
  expected: T | null;
  wrong: boolean;
};

export type AccountEvaluation = {
  status: HealthStatus;
  matchedRuleNames: string[];
  dailyLimit: FieldEvaluation<number>;
  minimumGap: FieldEvaluation<number>;
  warmupEnabled: FieldEvaluation<boolean>;
  warmupDaily: FieldEvaluation<number>;
  replyRate: FieldEvaluation<number>;
};

export type AccountStatusRow = {
  account: DisplayAccount;
  evaluation: AccountEvaluation;
};

type SortField =
  | "email"
  | "client"
  | "dailyLimit"
  | "minimumGap"
  | "warmupDaily"
  | "replyRate"
  | "bounceRate"
  | "status";
type SortOrder = "asc" | "desc";

function ruleMapKey(integrationId: string, tagKey: string) {
  return `${integrationId}::${tagKey}`;
}

function createClientId(value: string) {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "unassigned";
}

export default function EmailAccountsPageClient({
  realAccounts = [],
  rules = [],
}: {
  realAccounts?: RealAccount[];
  rules?: EmailAccountRule[];
}) {
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [smartleadFilter, setSmartleadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | HealthStatus>("all");
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [inspectedRow, setInspectedRow] = useState<AccountStatusRow | null>(null);

  // Convert real accounts to display accounts
  const accounts = useMemo(
    () => realAccounts.map(convertRealAccount),
    [realAccounts]
  );

  // Map enabled rules
  const enabledRuleMap = useMemo(() => {
    const map = new Map<string, EmailAccountRule>();
    for (const rule of rules) {
      if (!rule.is_enabled) continue;
      map.set(ruleMapKey(rule.integration_id, rule.tag_key), rule);
    }
    return map;
  }, [rules]);

  // Evaluate all accounts against rule engine
  const accountStatuses: AccountStatusRow[] = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        evaluation: evaluateAccount(account, enabledRuleMap),
      })),
    [accounts, enabledRuleMap]
  );

  // Distinct filter options
  const clients = useMemo(
    () => Array.from(new Set(accounts.map((item) => item.client))).sort(),
    [accounts]
  );

  const smartleads = useMemo(
    () => Array.from(new Set(accounts.map((item) => item.smartlead))).sort(),
    [accounts]
  );

  const smartleadDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const account of accounts) {
      if (account.smartlead) {
        counts.set(account.smartlead, (counts.get(account.smartlead) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  const accountTypes = useMemo(() => {
    const names = new Set<string>();
    for (const account of accounts) {
      for (const tag of account.tags) {
        names.add(tag.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  // Tag distribution
  const tagDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const account of accounts) {
      const uniqueTagNames = new Set<string>(
        account.tags.map((tag) => tag.name)
      );
      for (const tagName of uniqueTagNames) {
        counts.set(tagName, (counts.get(tagName) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [accounts]);

  // Overall metric counts
  const healthyCount = useMemo(
    () => accountStatuses.filter((item) => item.evaluation.status === "healthy").length,
    [accountStatuses]
  );

  const attentionCount = useMemo(
    () => accountStatuses.filter((item) => item.evaluation.status === "attention").length,
    [accountStatuses]
  );

  const notEvaluatedCount = useMemo(
    () => accountStatuses.filter((item) => item.evaluation.status === "not_evaluated").length,
    [accountStatuses]
  );

  const configuredRulesCount = useMemo(
    () => rules.filter((rule) => rule.is_enabled).length,
    [rules]
  );

  const complianceRate = useMemo(() => {
    const evaluatedTotal = healthyCount + attentionCount;
    if (evaluatedTotal === 0) return 100;
    return Math.round((healthyCount / evaluatedTotal) * 100);
  }, [healthyCount, attentionCount]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return accountStatuses.filter(({ account, evaluation }) => {
      const tagText = account.tags.map((tag) => tag.name).join(" ").toLowerCase();

      const matchesSearch =
        !searchValue ||
        account.email.toLowerCase().includes(searchValue) ||
        account.client.toLowerCase().includes(searchValue) ||
        (account.fromName && account.fromName.toLowerCase().includes(searchValue)) ||
        tagText.includes(searchValue);

      const matchesType =
        accountTypeFilter === "all" ||
        account.tags.some((tag) => tag.name === accountTypeFilter);

      const matchesClient =
        clientFilter === "all" || account.client === clientFilter;

      const matchesSmartlead =
        smartleadFilter === "all" || account.smartlead === smartleadFilter;

      const matchesStatus =
        statusFilter === "all" || evaluation.status === statusFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesClient &&
        matchesSmartlead &&
        matchesStatus
      );
    });
  }, [
    accountStatuses,
    search,
    accountTypeFilter,
    clientFilter,
    smartleadFilter,
    statusFilter,
  ]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];

    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "email":
          cmp = a.account.email.localeCompare(b.account.email);
          break;
        case "client":
          cmp = a.account.client.localeCompare(b.account.client);
          break;
        case "dailyLimit":
          cmp = (a.account.dailyLimit ?? -1) - (b.account.dailyLimit ?? -1);
          break;
        case "minimumGap":
          cmp = (a.account.minimumGap ?? -1) - (b.account.minimumGap ?? -1);
          break;
        case "warmupDaily":
          cmp = (a.account.warmupDaily ?? -1) - (b.account.warmupDaily ?? -1);
          break;
        case "replyRate":
          cmp = (a.account.replyRate ?? -1) - (b.account.replyRate ?? -1);
          break;
        case "bounceRate":
          cmp = (a.account.bounceRate ?? -1) - (b.account.bounceRate ?? -1);
          break;
        case "status": {
          const rank = (s: HealthStatus) =>
            s === "attention" ? 3 : s === "healthy" ? 2 : 1;
          cmp = rank(a.evaluation.status) - rank(b.evaluation.status);
          break;
        }
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [filteredAccounts, sortField, sortOrder]);

  // Paginated accounts
  const totalPages = Math.ceil(sortedAccounts.length / pageSize) || 1;
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAccounts.slice(startIndex, startIndex + pageSize);
  }, [sortedAccounts, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleCopyEmail = (email: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const isFilterActive =
    search !== "" ||
    accountTypeFilter !== "all" ||
    clientFilter !== "all" ||
    smartleadFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountTypeFilter("all");
    setClientFilter("all");
    setSmartleadFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-w-0 max-w-full pb-16 space-y-5 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight text-[#14243D]">
              Email Accounts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="mt-1 text-[12px] font-normal text-slate-500">
            Monitor mailbox thresholds, warmup rates, and tag alignment against your rule engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isFilterActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
          <Link
            href="/settings?tab=rules"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-[14px] font-medium text-[#2563EB] bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 rounded-lg shadow-2xs transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
            Rule Engine Settings
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Total Accounts</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#14243D] tabular-nums">
              {accounts.length.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">mailboxes</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Across {clients.length} clients
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Healthy</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#10B981] tabular-nums">
              {healthyCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-[#10B981]">
              {accounts.length > 0 ? Math.round((healthyCount / accounts.length) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            All rule parameters matched
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Needs Attention</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              attentionCount > 0 ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-[28px] font-semibold tracking-tight tabular-nums ${
              attentionCount > 0 ? "text-[#F59E0B]" : "text-[#14243D]"
            }`}>
              {attentionCount.toLocaleString()}
            </span>
            {attentionCount > 0 && (
              <span className="text-[12px] font-normal text-[#F59E0B]">
                Action required
              </span>
            )}
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Settings differ from rule
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Not Evaluated</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-slate-700 tabular-nums">
              {notEvaluatedCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">untargeted</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            No active tag rules apply
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#2563EB]">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Compliance</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563EB]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#2563EB] tabular-nums">
              {complianceRate}%
            </span>
            <span className="text-[12px] font-normal text-slate-500">of evaluated</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                complianceRate >= 90
                  ? "bg-emerald-500"
                  : complianceRate >= 70
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Smartlead Connections Quick Filter Bar */}
      {smartleadDistribution.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Smartlead Accounts
              </span>
              <span className="text-[11px] text-slate-400">
                ({smartleads.length} connected)
              </span>
            </div>
            {smartleadFilter !== "all" && (
              <button
                onClick={() => {
                  setSmartleadFilter("all");
                  handleFilterChange();
                }}
                className="text-xs text-[#2563EB] hover:text-blue-800 font-semibold cursor-pointer"
              >
                Reset integration filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSmartleadFilter("all");
                handleFilterChange();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                smartleadFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70"
              }`}
            >
              All Smartlead
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  smartleadFilter === "all"
                    ? "bg-slate-800 text-slate-300"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {accounts.length.toLocaleString()}
              </span>
            </button>

            {smartleadDistribution.map((item) => {
              const isSelected = smartleadFilter === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setSmartleadFilter(isSelected ? "all" : item.name);
                    handleFilterChange();
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-2xs"
                      : "bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 text-slate-700 border border-slate-200/70"
                  }`}
                >
                  <span className="truncate max-w-[200px]">{item.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-blue-500 text-blue-100"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              placeholder="Search email, client, or tag..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  handleFilterChange();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Client Filter */}
          <div className="lg:col-span-2">
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Account Type / Provider Tag Filter */}
          <div className="lg:col-span-3">
            <select
              value={accountTypeFilter}
              onChange={(e) => {
                setAccountTypeFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition"
            >
              <option value="all">All Account Types ({accountTypes.length})</option>
              {tagDistribution.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name} ({tag.count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Status Quick Filter Buttons */}
          <div className="lg:col-span-3 flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
            <button
              onClick={() => {
                setStatusFilter("all");
                handleFilterChange();
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer text-center ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setStatusFilter("healthy");
                handleFilterChange();
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer text-center ${
                statusFilter === "healthy"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 hover:bg-emerald-50/50"
              }`}
            >
              Healthy
            </button>
            <button
              onClick={() => {
                setStatusFilter("attention");
                handleFilterChange();
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer text-center ${
                statusFilter === "attention"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-amber-700 hover:bg-amber-50/50"
              }`}
            >
              Attention
            </button>
            <button
              onClick={() => {
                setStatusFilter("not_evaluated");
                handleFilterChange();
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer text-center ${
                statusFilter === "not_evaluated"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              Untargeted
            </button>
          </div>
        </div>

        {/* Results count & page size selector */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-semibold text-slate-900">{filteredAccounts.length.toLocaleString()}</span> of{" "}
              <span className="font-semibold text-slate-900">{accounts.length.toLocaleString()}</span> accounts
              {isFilterActive && " (filtered)"}
            </span>
            {isFilterActive && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-[#2563EB] hover:text-blue-800 font-semibold cursor-pointer underline ml-1"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-0.5 px-2 text-xs rounded border border-slate-200 bg-white text-slate-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-0">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                <th
                  onClick={() => toggleSort("email")}
                  className="py-2.5 px-2 xl:px-3 cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "21%" }}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">Email Account</span>
                    <SortIcon field="email" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("client")}
                  className="py-2.5 px-1.5 xl:px-2 cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "12%" }}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">Client</span>
                    <SortIcon field="client" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th className="py-2.5 px-1.5 xl:px-2" style={{ width: "13%" }}>
                  <span className="truncate">Tags</span>
                </th>
                <th
                  onClick={() => toggleSort("dailyLimit")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "6%" }}
                  title="Daily Limit"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Daily</span>
                    <SortIcon field="dailyLimit" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("minimumGap")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "6.5%" }}
                  title="Minimum Gap"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Min Gap</span>
                    <SortIcon field="minimumGap" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th className="py-2.5 px-1 text-center" style={{ width: "7%" }}>
                  <span className="truncate">Warmup</span>
                </th>
                <th
                  onClick={() => toggleSort("warmupDaily")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "7.5%" }}
                  title="Warmup Max Daily"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Warm Max</span>
                    <SortIcon field="warmupDaily" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("replyRate")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "6.5%" }}
                  title="Reply Rate"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Reply %</span>
                    <SortIcon field="replyRate" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("bounceRate")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "5.5%" }}
                  title="Bounce Rate"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Bounce</span>
                    <SortIcon field="bounceRate" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  className="py-2.5 px-1 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "10%" }}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="truncate">Status</span>
                    <SortIcon field="status" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th className="py-2.5 px-0.5 text-center" style={{ width: "5%" }}>
                  <span className="sr-only">Inspect</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-normal">
              {paginatedAccounts.length > 0 ? (
                paginatedAccounts.map((row) => (
                  <AccountTableRow
                    key={row.account.id}
                    row={row}
                    copiedEmail={copiedEmail}
                    onCopyEmail={handleCopyEmail}
                    onInspect={() => setInspectedRow(row)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Mail className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No email accounts found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try adjusting your search criteria, account type filter, or status selection.
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={clearFilters}
                          className="mt-3 text-xs font-semibold text-[#2563EB] hover:text-blue-800"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-200/80 gap-3">
            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
              {" · "}
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, sortedAccounts.length)} of {sortedAccounts.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              {/* Page numbers preview */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition cursor-pointer ${
                        currentPage === p
                          ? "bg-slate-900 text-white font-bold"
                          : "text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Drawer / Slide-Over Modal */}
      {inspectedRow && (
        <InspectAccountDrawer
          row={inspectedRow}
          onClose={() => setInspectedRow(null)}
          onCopyEmail={handleCopyEmail}
          copiedEmail={copiedEmail}
        />
      )}
    </div>
  );
}

/* Table Row Component */
function AccountTableRow({
  row,
  copiedEmail,
  onCopyEmail,
  onInspect,
}: {
  row: AccountStatusRow;
  copiedEmail: string | null;
  onCopyEmail: (email: string) => void;
  onInspect: () => void;
}) {
  const { account, evaluation } = row;
  const isEvaluated = evaluation.status !== "not_evaluated";
  const hasClient = account.client && account.client !== "Unassigned";

  return (
    <tr className="hover:bg-blue-50/30 transition-colors group">
      {/* Email column */}
      <td className="py-2 px-2 xl:px-3">
        <div className="flex items-center gap-1.5">
          <div
            className="truncate max-w-[170px] xl:max-w-[210px] font-semibold text-slate-900 group-hover:text-[#2563EB] transition-colors text-xs"
            title={account.email}
          >
            {account.email}
          </div>
          <button
            onClick={() => onCopyEmail(account.email)}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer flex-shrink-0"
            title="Copy email"
          >
            {copiedEmail === account.email ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
        <div className="text-[10px] text-slate-400 truncate max-w-[170px] xl:max-w-[210px]">
          {account.smartlead}
        </div>
      </td>

      {/* Client column */}
      <td className="py-2 px-1.5 xl:px-2">
        {hasClient ? (
          <Link
            href={`/clients/${createClientId(account.client)}`}
            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#2563EB] hover:underline max-w-[110px] xl:max-w-[130px] truncate text-xs"
            title={`View client ${account.client}`}
          >
            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{account.client}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
            Unassigned
          </span>
        )}
      </td>

      {/* Account Tags */}
      <td className="py-2 px-1.5 xl:px-2">
        <div className="flex flex-wrap gap-1 max-w-[120px] xl:max-w-[150px]">
          {account.tags.slice(0, 1).map((tag) => (
            <span
              key={tag.key}
              title={tag.name}
              className="inline-block max-w-[100px] xl:max-w-[120px] truncate px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60"
            >
              {tag.name}
            </span>
          ))}
          {account.tags.length > 1 && (
            <span
              className="px-1 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 flex-shrink-0"
              title={account.tags.map((t) => t.name).join(", ")}
            >
              +{account.tags.length - 1}
            </span>
          )}
        </div>
      </td>

      {/* Daily Limit */}
      <td className="py-2 px-1 text-center text-xs">
        <ValueBadge
          value={account.dailyLimit}
          field={evaluation.dailyLimit}
          evaluated={isEvaluated}
        />
      </td>

      {/* Minimum Gap */}
      <td className="py-2 px-1 text-center text-xs">
        <ValueBadge
          value={account.minimumGap}
          field={evaluation.minimumGap}
          evaluated={isEvaluated}
          suffix="m"
        />
      </td>

      {/* Warmup */}
      <td className="py-2 px-1 text-center text-xs">
        <WarmupStatusBadge
          enabled={account.warmupEnabled}
          field={evaluation.warmupEnabled}
          evaluated={isEvaluated}
        />
      </td>

      {/* Warmup Daily */}
      <td className="py-2 px-1 text-center text-xs">
        <ValueBadge
          value={account.warmupDaily}
          field={evaluation.warmupDaily}
          evaluated={isEvaluated}
        />
      </td>

      {/* Reply Rate */}
      <td className="py-2 px-1 text-center text-xs">
        <ValueBadge
          value={account.replyRate}
          field={evaluation.replyRate}
          evaluated={isEvaluated}
          suffix="%"
        />
      </td>

      {/* Bounce Rate */}
      <td className="py-2 px-1 text-center text-xs">
        {account.bounceRate !== null ? (
          <span
            className={`font-semibold ${
              account.bounceRate > 3
                ? "text-rose-600 font-bold"
                : account.bounceRate > 1
                ? "text-amber-600"
                : "text-slate-600"
            }`}
          >
            {account.bounceRate}%
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Status Pill */}
      <td className="py-2 px-1 text-center">
        <HealthPill status={evaluation.status} />
      </td>

      {/* Inspect Action */}
      <td className="py-2 px-0.5 text-center">
        <button
          onClick={onInspect}
          className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 transition cursor-pointer"
          title="Inspect account details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

/* Sort Icon Indicator */
function SortIcon({
  field,
  currentField,
  order,
}: {
  field: SortField;
  currentField: SortField;
  order: SortOrder;
}) {
  if (field !== currentField) {
    return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
  }
  return order === "asc" ? (
    <ArrowUp className="w-3 h-3 text-[#2563EB] font-bold" />
  ) : (
    <ArrowDown className="w-3 h-3 text-[#2563EB] font-bold" />
  );
}

/* Metric Value Badge with Mismatch Indicator */
function ValueBadge({
  value,
  field,
  evaluated,
  suffix = "",
}: {
  value: number | null;
  field: FieldEvaluation<number>;
  evaluated: boolean;
  suffix?: string;
}) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-slate-300 font-medium">—</span>
        {field.configured && field.wrong && (
          <span className="text-[9px] text-amber-600 font-medium mt-0.5">
            Exp: {field.expected ?? "conf"}
          </span>
        )}
      </div>
    );
  }

  const isWrong = evaluated && field.configured && field.wrong;

  return (
    <div className="flex flex-col items-center leading-tight">
      <span
        className={`font-semibold ${
          isWrong
            ? "text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80"
            : evaluated && field.configured
            ? "text-slate-800"
            : "text-slate-600"
        }`}
      >
        {value}
        {suffix}
      </span>
      {isWrong && (
        <span className="text-[9px] text-amber-600 font-bold tracking-tight mt-0.5">
          exp {field.expected ?? "conf"}
        </span>
      )}
    </div>
  );
}

/* Warmup Status Badge */
function WarmupStatusBadge({
  enabled,
  field,
  evaluated,
}: {
  enabled: boolean | null;
  field: FieldEvaluation<boolean>;
  evaluated: boolean;
}) {
  if (enabled === null) {
    return <span className="text-slate-300">—</span>;
  }

  const isWrong = evaluated && field.configured && field.wrong;

  return (
    <div className="flex flex-col items-center leading-tight">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
          isWrong
            ? "bg-amber-100 text-amber-800 border border-amber-300"
            : enabled
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            enabled ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
        {enabled ? "ON" : "OFF"}
      </span>
      {isWrong && (
        <span className="text-[9px] text-amber-600 font-bold mt-0.5">
          exp {field.expected ? "ON" : "OFF"}
        </span>
      )}
    </div>
  );
}

/* Status Pill */
function HealthPill({ status }: { status: HealthStatus }) {
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        Healthy
      </span>
    );
  }

  if (status === "attention") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300/80 shadow-2xs animate-pulse">
        <AlertCircle className="w-3 h-3 text-amber-500" />
        Attention
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
      Untargeted
    </span>
  );
}

/* Account Details Slide-Over Drawer */
function InspectAccountDrawer({
  row,
  onClose,
  onCopyEmail,
  copiedEmail,
}: {
  row: AccountStatusRow;
  onClose: () => void;
  onCopyEmail: (email: string) => void;
  copiedEmail: string | null;
}) {
  const { account, evaluation } = row;
  const isEvaluated = evaluation.status !== "not_evaluated";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate max-w-[320px]">
                {account.email}
              </h2>
              <button
                onClick={() => onCopyEmail(account.email)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                title="Copy email"
              >
                {copiedEmail === account.email ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{account.smartlead}</span>
              <span>·</span>
              <span>ID #{account.externalId}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              evaluation.status === "healthy"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : evaluation.status === "attention"
                ? "bg-amber-50/70 border-amber-300 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            {evaluation.status === "healthy" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : evaluation.status === "attention" ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            )}

            <div>
              <div className="font-bold text-sm">
                {evaluation.status === "healthy"
                  ? "Settings Fully Compliant"
                  : evaluation.status === "attention"
                  ? "Rule Mismatch Detected"
                  : "Not Evaluated by Active Rules"}
              </div>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                {evaluation.status === "healthy"
                  ? "All daily volume and warmup settings strictly match your configured rules."
                  : evaluation.status === "attention"
                  ? "One or more sending thresholds differ from the active rules associated with this account's tags."
                  : "No configured active rules in Settings match this account's assigned tags."}
              </p>
            </div>
          </div>

          {/* Matched Rules */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Matched Rules
            </h3>
            {evaluation.matchedRuleNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {evaluation.matchedRuleNames.map((name) => (
                  <span
                    key={name}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                None. Assign matching tags in Smartlead or configure rules in Settings.
              </p>
            )}
          </div>

          {/* Threshold Comparison Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Parameter Evaluation Breakdown
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              <ParameterRow
                label="Daily Sending Limit"
                actual={`${account.dailyLimit ?? "—"} emails/day`}
                field={evaluation.dailyLimit}
                formatExpected={(val) => `${val} emails/day`}
              />
              <ParameterRow
                label="Minimum Gap Between Emails"
                actual={`${account.minimumGap ?? "—"} minutes`}
                field={evaluation.minimumGap}
                formatExpected={(val) => `${val} minutes`}
              />
              <ParameterRow
                label="Warmup Status"
                actual={account.warmupEnabled === null ? "—" : account.warmupEnabled ? "ON" : "OFF"}
                field={evaluation.warmupEnabled}
                formatExpected={(val) => (val ? "ON" : "OFF")}
              />
              <ParameterRow
                label="Warmup Daily Limit"
                actual={`${account.warmupDaily ?? "—"} emails/day`}
                field={evaluation.warmupDaily}
                formatExpected={(val) => `${val} emails/day`}
              />
              <ParameterRow
                label="Warmup Reply Rate"
                actual={`${account.replyRate ?? "—"}%`}
                field={evaluation.replyRate}
                formatExpected={(val) => `${val}%`}
              />
            </div>
          </div>

          {/* Account Metadata */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Account Overview
            </h3>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                {account.client !== "Unassigned" ? (
                  <Link
                    href={`/clients/${createClientId(account.client)}`}
                    className="font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    {account.client}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-slate-400 font-medium">Unassigned</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sender Name:</span>
                <span className="text-slate-800 font-medium">
                  {account.fromName || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bounce Rate:</span>
                <span className="text-slate-800 font-semibold">
                  {account.bounceRate !== null ? `${account.bounceRate}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Warmup Reputation:</span>
                <span className="text-slate-800 font-semibold">
                  {account.reputation !== null ? `${account.reputation}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* Parameter Comparison Row in Drawer */
function ParameterRow<T extends number | boolean>({
  label,
  actual,
  field,
  formatExpected,
}: {
  label: string;
  actual: string;
  field: FieldEvaluation<T>;
  formatExpected: (v: T) => string;
}) {
  return (
    <div className="p-3 flex items-center justify-between">
      <div>
        <div className="font-medium text-slate-800">{label}</div>
        {field.configured ? (
          <div className="text-[11px] text-slate-400 mt-0.5">
            Expected:{" "}
            <span className="font-semibold text-slate-600">
              {field.conflict
                ? "Conflicting tags"
                : field.expected !== null
                ? formatExpected(field.expected)
                : "None"}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 mt-0.5">
            Not configured in active rules
          </div>
        )}
      </div>

      <div className="text-right">
        <div
          className={`font-bold ${
            field.wrong
              ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
              : field.configured
              ? "text-emerald-700 font-semibold"
              : "text-slate-700"
          }`}
        >
          {actual}
        </div>
        {field.wrong && (
          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
            Mismatch
          </span>
        )}
      </div>
    </div>
  );
}

/* Core Evaluation Logic */
function evaluateAccount(
  account: DisplayAccount,
  enabledRuleMap: Map<string, EmailAccountRule>
): AccountEvaluation {
  const matchedRules = account.tags
    .map((tag) => enabledRuleMap.get(ruleMapKey(account.integrationId, tag.key)))
    .filter((rule): rule is EmailAccountRule => Boolean(rule));

  if (matchedRules.length === 0) {
    return {
      status: "not_evaluated",
      matchedRuleNames: [],
      dailyLimit: emptyFieldEvaluation<number>(),
      minimumGap: emptyFieldEvaluation<number>(),
      warmupEnabled: emptyFieldEvaluation<boolean>(),
      warmupDaily: emptyFieldEvaluation<number>(),
      replyRate: emptyFieldEvaluation<number>(),
    };
  }

  const dailyLimit = evaluateField(
    account.dailyLimit,
    matchedRules.map((rule) => rule.message_per_day)
  );

  const minimumGap = evaluateField(
    account.minimumGap,
    matchedRules.map((rule) => rule.minimum_gap)
  );

  const warmupEnabled = evaluateField(
    account.warmupEnabled,
    matchedRules.map((rule) => rule.warmup_enabled)
  );

  const warmupDaily = evaluateField(
    account.warmupDaily,
    matchedRules.map((rule) => rule.warmup_daily)
  );

  const replyRate = evaluateField(
    account.replyRate,
    matchedRules.map((rule) => rule.reply_rate)
  );

  const fields = [
    dailyLimit,
    minimumGap,
    warmupEnabled,
    warmupDaily,
    replyRate,
  ];

  const hasConfiguredField = fields.some((field) => field.configured);

  const status: HealthStatus = !hasConfiguredField
    ? "not_evaluated"
    : fields.some((field) => field.wrong)
    ? "attention"
    : "healthy";

  return {
    status,
    matchedRuleNames: matchedRules.map((rule) => rule.tag_name),
    dailyLimit,
    minimumGap,
    warmupEnabled,
    warmupDaily,
    replyRate,
  };
}

function evaluateField<T extends number | boolean>(
  actual: T | null,
  expectedValues: Array<T | null>
): FieldEvaluation<T> {
  const configuredValues = expectedValues.filter(
    (value): value is T => value !== null
  );

  if (configuredValues.length === 0) {
    return emptyFieldEvaluation<T>();
  }

  const uniqueValues = Array.from(new Set(configuredValues));

  if (uniqueValues.length > 1) {
    return {
      configured: true,
      conflict: true,
      expected: null,
      wrong: true,
    };
  }

  const expected = uniqueValues[0];

  return {
    configured: true,
    conflict: false,
    expected,
    wrong: actual === null || actual !== expected,
  };
}

function emptyFieldEvaluation<T extends number | boolean>(): FieldEvaluation<T> {
  return {
    configured: false,
    conflict: false,
    expected: null,
    wrong: false,
  };
}

function convertRealAccount(account: RealAccount): DisplayAccount {
  const raw = account.raw_data || {};
  const warmupDetails = asObject(raw.warmup_details);

  const integration = Array.isArray(account.integrations)
    ? account.integrations[0]
    : account.integrations;

  return {
    id: account.id,
    externalId: account.external_id,
    integrationId: account.integration_id,
    email: account.email || account.username || "Unknown",
    fromName: getText(account.from_name) || getText(raw.from_name) || null,
    client: cleanClientName(
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client) ||
      "Unassigned"
    ),
    smartlead: integration?.name || "Smartlead",
    tags: getAccountTags(raw),
    dailyLimit: getNumber(raw.message_per_day),
    minimumGap: getNumber(raw.minTimeToWaitInMins),
    warmupEnabled: getWarmupEnabled(warmupDetails.status),
    warmupDaily:
      getNumber(warmupDetails.max_email_per_day) ??
      getNumber(warmupDetails.warmup_max_count),
    reputation:
      getNumber(raw.warmup_reputation) ??
      getNumber(warmupDetails.warmup_reputation),
    bounceRate: getNumber(raw.bounce_rate),
    replyRate: getNumber(warmupDetails.reply_rate),
    syncedAt: account.synced_at,
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
        if (!name) return null;
        return {
          key: normalizeTagKey(name),
          name,
        };
      }

      const object = asObject(item);
      const name = getText(object.tag_name) || getText(object.name);
      if (!name) return null;

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

function asObject(value: unknown): RawData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RawData;
  }
  return {};
}

function getWarmupEnabled(value: unknown) {
  const directBoolean = getBoolean(value);
  if (directBoolean !== null) {
    return directBoolean;
  }

  if (typeof value !== "string") {
    return null;
  }

  const status = value.trim().toUpperCase();
  if (status === "ACTIVE" || status === "ENABLED" || status === "ON") {
    return true;
  }

  if (
    status === "INACTIVE" ||
    status === "DISABLED" ||
    status === "PAUSED" ||
    status === "STOPPED" ||
    status === "OFF"
  ) {
    return false;
  }

  return null;
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

function getBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1) return true;
  if (value === 0) return false;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (
      text === "true" ||
      text === "1" ||
      text === "on" ||
      text === "enabled" ||
      text === "active"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "off" ||
      text === "disabled" ||
      text === "inactive"
    ) {
      return false;
    }
  }

  return null;
}
