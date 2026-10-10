"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  CheckCircle2,
  TriangleAlert,
  Search,
  Eye,
  X,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Mail,
  Globe,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  Zap,
  Copy,
  Check,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Activity,
  SlidersHorizontal,
} from "lucide-react";

export type RealIssue = {
  id: string;
  source: string;
  client: string | null;
  issue_type: string;
  item: string;
  account_type: string | null;
  current_value: string | null;
  expected_value: string | null;
  severity: string;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

export type DisplayIssue = {
  id: string;
  source: string;
  client: string;
  issueType: string;
  item: string;
  accountType: string;
  currentValue: string;
  expectedValue: string;
  severity: string;
  status: string;
  detectedAt: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  resolvedAt?: string | null;
  // Pre-computed lowercase search index for maximum filtering performance
  searchIndex: string;
};

type ScanToast = {
  title: string;
  message: string;
  summary?: {
    accountsChecked: number;
    domainsChecked: number;
    openIssues: number;
    critical: number;
    warnings: number;
    resolved: number;
  };
};

type SortField = "severity" | "detectedAt" | "item" | "client" | "status";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

export default function IssuesPageClient({
  realIssues,
  hasLiveData,
}: {
  realIssues: RealIssue[];
  hasLiveData: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>("open");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("detectedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [scanning, setScanning] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DisplayIssue | null>(null);
  const [toast, setToast] = useState<ScanToast | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-refresh when sync occurs or user triggers action
  useEffect(() => {
    const handleAutoRefresh = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    window.addEventListener("outreach:refresh", handleAutoRefresh);

    return () => {
      window.removeEventListener("outreach:refresh", handleAutoRefresh);
    };
  }, [router]);

  // Memoized full issues dataset with precomputed search index
  const issues: DisplayIssue[] = useMemo(() => {
    return realIssues.map(convertRealIssue);
  }, [realIssues]);

  // Single-pass computation for KPI Counts & Dropdown Filter Lists
  const { openCount, criticalCount, warningCount, resolvedCount, clients, sources } = useMemo(() => {
    let open = 0;
    let critical = 0;
    let warning = 0;
    let resolved = 0;
    const clientSet = new Set<string>();
    const sourceSet = new Set<string>();

    for (let i = 0; i < issues.length; i++) {
      const it = issues[i];
      if (it.client) clientSet.add(it.client);
      if (it.source) sourceSet.add(it.source);

      if (it.status === "Open") {
        open++;
        if (it.severity === "Critical") critical++;
        else if (it.severity === "Warning") warning++;
      } else if (it.status === "Resolved") {
        resolved++;
      }
    }

    return {
      openCount: open,
      criticalCount: critical,
      warningCount: warning,
      resolvedCount: resolved,
      clients: Array.from(clientSet).sort(),
      sources: Array.from(sourceSet).sort(),
    };
  }, [issues]);

  // High-performance filtered and sorted dataset
  const filteredAndSortedIssues = useMemo(() => {
    const q = search.trim().toLowerCase();

    // 1. Filtering
    const matched = issues.filter((issue) => {
      if (activeKpiFilter === "open" && issue.status !== "Open") return false;
      if (activeKpiFilter === "critical" && (issue.status !== "Open" || issue.severity !== "Critical")) return false;
      if (activeKpiFilter === "warnings" && (issue.status !== "Open" || issue.severity !== "Warning")) return false;
      if (activeKpiFilter === "resolved" && issue.status !== "Resolved") return false;

      if (clientFilter !== "all" && issue.client !== clientFilter) return false;
      if (sourceFilter !== "all" && issue.source !== sourceFilter) return false;
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      if (statusFilter !== "all" && issue.status !== statusFilter) return false;

      if (q && !issue.searchIndex.includes(q)) return false;

      return true;
    });

    // 2. Sorting
    return matched.sort((a, b) => {
      let cmp = 0;
      if (sortField === "severity") {
        const weightA = a.severity === "Critical" ? 2 : 1;
        const weightB = b.severity === "Critical" ? 2 : 1;
        cmp = weightB - weightA;
      } else if (sortField === "item") {
        cmp = a.item.localeCompare(b.item);
      } else if (sortField === "client") {
        cmp = a.client.localeCompare(b.client);
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp = (b.detectedAt || "").localeCompare(a.detectedAt || "");
      }

      return sortOrder === "asc" ? -cmp : cmp;
    });
  }, [
    issues,
    search,
    clientFilter,
    sourceFilter,
    severityFilter,
    statusFilter,
    activeKpiFilter,
    sortField,
    sortOrder,
  ]);

  // Paginated Sliced View for instantaneous rendering
  const totalPages = Math.ceil(filteredAndSortedIssues.length / pageSize) || 1;
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedIssues.slice(start, start + pageSize);
  }, [filteredAndSortedIssues, currentPage, pageSize]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  function toggleKpiFilter(filter: string) {
    setActiveKpiFilter((curr) => (curr === filter ? null : filter));
    setCurrentPage(1);
  }

  function handleCopyItem(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  }

  function resetAllFilters() {
    setSearch("");
    setClientFilter("all");
    setSourceFilter("all");
    setSeverityFilter("all");
    setStatusFilter("all");
    setActiveKpiFilter(null);
    setCurrentPage(1);
  }

  async function handleScan() {
    setScanning(true);

    try {
      const response = await fetch("/api/issues/scan", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setToast({
          title: "Scan Unsuccessful",
          message: result.error || "Unable to complete issue scan.",
        });
        setTimeout(() => setToast(null), 6000);
        return;
      }

      setToast({
        title: "Scan Successfully Completed",
        message: `Audited ${result.summary?.accountsChecked ?? 0} accounts and ${result.summary?.domainsChecked ?? 0} domains.`,
        summary: result.summary,
      });

      setTimeout(() => setToast(null), 7000);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("outreach:refresh"));
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setToast({
        title: "Connection Error",
        message: "Failed to communicate with scan service.",
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setScanning(false);
    }
  }

  const hasActiveFilters = Boolean(
    search ||
      clientFilter !== "all" ||
      sourceFilter !== "all" ||
      severityFilter !== "all" ||
      statusFilter !== "all" ||
      activeKpiFilter !== "open"
  );

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 rounded-2xl shadow-2xl border backdrop-blur-md bg-slate-900/95 text-slate-100 border-slate-700/80">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{toast.title}</p>
                <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>

                {toast.summary && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                    <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                      <span className="block text-[10px] text-slate-400">Open Issues</span>
                      <span className="text-xs font-bold text-amber-400">
                        {toast.summary.openIssues}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                      <span className="block text-[10px] text-slate-400">Critical</span>
                      <span className="text-xs font-bold text-rose-400">
                        {toast.summary.critical}
                      </span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                      <span className="block text-[10px] text-slate-400">Resolved</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {toast.summary.resolved}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Hero & Action Banner */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-50/70 via-slate-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200/80">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Infrastructure Drift Detection
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Live Pipeline Audit
              </span>
            </div>

            <h1 className="text-xl sm:text-[26px] font-semibold tracking-tight text-[#14243D]">
              System Diagnostics & Anomaly Hub
            </h1>

            <p className="text-[12px] font-normal text-slate-500 leading-relaxed">
              Detect mailbox daily cap breaches, warmup setting drift, domain DNS failures, and API connection drops across all accounts.
            </p>
          </div>

          {/* Audit / Scan Button */}
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium text-white bg-[#2563EB] hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-600/20 hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${scanning ? "animate-spin text-white" : ""}`}
            />
            <span>{scanning ? "Syncing & Auditing Pipeline..." : "Audit Pipeline Now"}</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Open Issues */}
        <div
          onClick={() => toggleKpiFilter("open")}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "open"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal uppercase tracking-wider">
              Open Issues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold text-[#14243D] mt-2 tabular-nums">
            {openCount}
          </div>
          <div className="flex items-center justify-between text-[12px] font-normal text-slate-400 mt-1">
            <span>Requiring resolution</span>
            <span className="font-semibold text-amber-600">Active</span>
          </div>
        </div>

        {/* Critical */}
        <div
          onClick={() => toggleKpiFilter("critical")}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "critical"
              ? "border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500">
              Critical
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold text-[#EF4444] mt-2 tabular-nums">
            {criticalCount}
          </div>
          <div className="flex items-center justify-between text-[12px] font-normal text-slate-400 mt-1">
            <span>Severe anomalies</span>
            <span className="font-semibold text-rose-600">Immediate</span>
          </div>
        </div>

        {/* Warnings */}
        <div
          onClick={() => toggleKpiFilter("warnings")}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "warnings"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500">
              Warnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <TriangleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold text-[#F59E0B] mt-2 tabular-nums">
            {warningCount}
          </div>
          <div className="flex items-center justify-between text-[12px] font-normal text-slate-400 mt-1">
            <span>Rule configuration drift</span>
            <span className="font-semibold text-amber-700">Audit</span>
          </div>
        </div>

        {/* Resolved */}
        <div
          onClick={() => toggleKpiFilter("resolved")}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "resolved"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500">
              Resolved
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-semibold text-[#10B981] mt-2 tabular-nums">
            {resolvedCount}
          </div>
          <div className="flex items-center justify-between text-[12px] font-normal text-slate-400 mt-1">
            <span>Cleared & compliant</span>
            <span className="font-semibold text-emerald-600">Archived</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by mailbox, issue category, client, or source..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">All Sources ({sources.length})</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition-colors whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container with Client-Side Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-slate-900">Detected Issues</h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredAndSortedIssues.length} found
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAndSortedIssues.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              No matching issues found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Your infrastructure is aligned with expected rules or matches your filter criteria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th
                    onClick={() => handleSort("severity")}
                    className="py-3 px-5 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Severity</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("item")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Mailbox / Domain</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Issue Category</th>
                  <th
                    onClick={() => handleSort("client")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Client</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Setting Drift</th>
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("detectedAt")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Detected</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 w-12 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] font-normal">
                {paginatedIssues.map((issue) => {
                  const isCritical = issue.severity === "Critical";
                  const isOpen = issue.status === "Open";

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                    >
                      {/* Severity Badge */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCritical
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCritical
                                ? "bg-rose-500 animate-pulse"
                                : "bg-amber-500"
                            }`}
                          />
                          {issue.severity}
                        </span>
                      </td>

                      {/* Mailbox / Item */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                        <div className="flex items-center gap-2">
                          {issue.item.includes("@") ? (
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[220px]">
                            {issue.item}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyItem(issue.item, issue.id);
                            }}
                            title="Copy address"
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                          >
                            {copiedId === issue.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Issue Category */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div className="truncate max-w-[190px]">
                          {issue.issueType}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">
                            {issue.client}
                          </span>
                        </span>
                      </td>

                      {/* Setting Drift (Current vs Expected) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 truncate max-w-[110px]"
                            title={`Current: ${issue.currentValue}`}
                          >
                            {issue.currentValue}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span
                            className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[110px]"
                            title={`Target: ${issue.expectedValue}`}
                          >
                            {issue.expectedValue}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOpen
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isOpen ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          {issue.status}
                        </span>
                      </td>

                      {/* Detected Date */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap" suppressHydrationWarning>
                        {issue.detectedAt}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIssue(issue);
                          }}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Navigation Bar */}
        {filteredAndSortedIssues.length > pageSize && (
          <div className="p-4 px-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 text-xs text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-900">
                {(currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, filteredAndSortedIssues.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900">
                {filteredAndSortedIssues.length}
              </strong>{" "}
              issues
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Detail Inspection Modal */}
      {selectedIssue && (
        <div
          onClick={() => setSelectedIssue(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                    selectedIssue.severity === "Critical"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-amber-50 text-amber-600 border-amber-200"
                  }`}
                >
                  {selectedIssue.severity === "Critical" ? (
                    <Flame className="w-5 h-5" />
                  ) : (
                    <TriangleAlert className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        selectedIssue.severity === "Critical"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedIssue.severity}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {selectedIssue.source}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {selectedIssue.issueType}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Target Entity Overview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    Target Resource
                  </span>
                  <span className="font-semibold text-slate-700">
                    {selectedIssue.accountType}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 break-all flex items-center gap-1.5">
                  {selectedIssue.item.includes("@") ? (
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span>{selectedIssue.item}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Client: {selectedIssue.client}</span>
                </div>
              </div>

              {/* Setting Comparison Drift Cards */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Configuration Setting Drift
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-700 block uppercase tracking-wider mb-1">
                      Current Value
                    </span>
                    <span className="text-sm font-bold text-rose-900 block break-words">
                      {selectedIssue.currentValue}
                    </span>
                    <span className="text-[10px] text-rose-600 mt-1 block">
                      Violates outreach rule
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider mb-1">
                      Target Guideline
                    </span>
                    <span className="text-sm font-bold text-emerald-900 block break-words">
                      {selectedIssue.expectedValue}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 block">
                      Recommended value
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Timestamps */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Lifecycle Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedIssue.status === "Open"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {selectedIssue.status === "Open" ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    )}
                    {selectedIssue.status}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    First Detected
                  </span>
                  <span className="font-semibold text-slate-800" suppressHydrationWarning>
                    {selectedIssue.detectedAt}
                  </span>
                </div>
              </div>

              {/* Actionable Resolution Guidance */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-950">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  Resolution Recommendation
                </span>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Log in to your {selectedIssue.source} dashboard for &ldquo;
                  {selectedIssue.item}&rdquo; and adjust the setting from{" "}
                  <strong className="text-rose-700">{selectedIssue.currentValue}</strong> to{" "}
                  <strong className="text-emerald-700">{selectedIssue.expectedValue}</strong>.
                  Then trigger &ldquo;Audit Pipeline Now&rdquo; to automatically verify resolution.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function convertRealIssue(issue: RealIssue): DisplayIssue {
  const detected = formatDateTime(issue.first_seen_at);
  const clientName = issue.client || "Unassigned";
  const itemStr = issue.item;
  const issueTypeStr = issue.issue_type;
  const sourceStr = issue.source;

  return {
    id: issue.id,
    source: sourceStr,
    client: clientName,
    issueType: issueTypeStr,
    item: itemStr,
    accountType: issue.account_type || "Unclassified",
    currentValue: issue.current_value || "Not available",
    expectedValue: issue.expected_value || "Not available",
    severity: issue.severity,
    status: issue.status,
    detectedAt: detected,
    firstSeenAt: detected,
    lastSeenAt: formatDateTime(issue.last_seen_at),
    resolvedAt: issue.resolved_at ? formatDateTime(issue.resolved_at) : null,
    searchIndex: `${itemStr} ${issueTypeStr} ${clientName} ${sourceStr}`.toLowerCase(),
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
