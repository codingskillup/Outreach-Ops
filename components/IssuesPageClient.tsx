"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { issueDemoData } from "@/lib/issueDemoData";
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

export default function IssuesPageClient({
  realIssues,
  hasLiveData,
}: {
  realIssues: RealIssue[];
  hasLiveData: boolean;
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>("open");

  const [scanning, setScanning] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DisplayIssue | null>(null);
  const [toast, setToast] = useState<ScanToast | null>(null);

  const issues: DisplayIssue[] = useMemo(() => {
    if (hasLiveData) {
      return realIssues.map(convertRealIssue);
    }

    return issueDemoData.map((issue) => ({
      id: issue.id,
      source: issue.source,
      client: issue.client,
      issueType: issue.issueType,
      item: issue.item,
      accountType: issue.accountType || "Standard Account",
      currentValue: issue.currentValue || "Not configured",
      expectedValue: issue.expectedValue || "Standard guideline",
      severity: issue.severity,
      status: issue.status,
      detectedAt: issue.detectedAt,
      firstSeenAt: issue.detectedAt,
      lastSeenAt: issue.detectedAt,
    }));
  }, [hasLiveData, realIssues]);

  const clients = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.client))).sort(),
    [issues]
  );

  const sources = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.source))).sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const value = search.trim().toLowerCase();

    return issues.filter((issue) => {
      // Interactive KPI card filters
      if (activeKpiFilter === "open" && issue.status !== "Open") return false;
      if (
        activeKpiFilter === "critical" &&
        (issue.status !== "Open" || issue.severity !== "Critical")
      )
        return false;
      if (
        activeKpiFilter === "warnings" &&
        (issue.status !== "Open" || issue.severity !== "Warning")
      )
        return false;
      if (activeKpiFilter === "resolved" && issue.status !== "Resolved") return false;

      const matchesSearch =
        !value ||
        issue.item.toLowerCase().includes(value) ||
        issue.issueType.toLowerCase().includes(value) ||
        issue.client.toLowerCase().includes(value);

      const matchesClient =
        clientFilter === "all" || issue.client === clientFilter;

      const matchesSource =
        sourceFilter === "all" || issue.source === sourceFilter;

      const matchesSeverity =
        severityFilter === "all" || issue.severity === severityFilter;

      const matchesStatus =
        statusFilter === "all" || issue.status === statusFilter;

      return (
        matchesSearch &&
        matchesClient &&
        matchesSource &&
        matchesSeverity &&
        matchesStatus
      );
    });
  }, [
    issues,
    search,
    clientFilter,
    sourceFilter,
    severityFilter,
    statusFilter,
    activeKpiFilter,
  ]);

  const openCount = issues.filter((issue) => issue.status === "Open").length;
  const criticalCount = issues.filter(
    (issue) => issue.status === "Open" && issue.severity === "Critical"
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.status === "Open" && issue.severity === "Warning"
  ).length;
  const resolvedCount = issues.filter((issue) => issue.status === "Resolved").length;

  async function handleScan() {
    if (!hasLiveData) {
      setToast({
        title: "Simulation Demo Mode",
        message: "Connect Smartlead or EmailGuard in Settings to trigger live infrastructure scanning.",
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }

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
      router.refresh();
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

  function toggleKpiFilter(filter: string) {
    setActiveKpiFilter((curr) => (curr === filter ? null : filter));
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 rounded-xl shadow-2xl border backdrop-blur-md bg-slate-900/95 text-slate-100 border-slate-700/80">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>

                {toast.summary && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/60">
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

      {/* Top Action & Mode Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Infrastructure Anomaly Detection
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                hasLiveData
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {hasLiveData ? "Live Pipeline" : "Demo Mode"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Detect mailbox setting drift, warmup cap violations, and domain deliverability risks.
          </p>
        </div>

        {/* Scan Button */}
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-md shadow-slate-900/10 hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${scanning ? "animate-spin text-indigo-400" : ""}`}
          />
          <span>{scanning ? "Auditing Pipeline..." : "Scan Now"}</span>
        </button>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => toggleKpiFilter("open")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "open"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Open Issues
            </span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {openCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requiring attention</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("critical")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "critical"
              ? "border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Critical
            </span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1.5">
            {criticalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">High severity items</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("warnings")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "warnings"
              ? "border-yellow-500 ring-2 ring-yellow-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Warnings
            </span>
            <TriangleAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {warningCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Configuration drift</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("resolved")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "resolved"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resolved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1.5">
            {resolvedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Cleared anomalies</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mailbox, issue, or client..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
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
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Reset Filters button */}
          {(search ||
            clientFilter !== "all" ||
            sourceFilter !== "all" ||
            severityFilter !== "all" ||
            statusFilter !== "all" ||
            activeKpiFilter !== "open") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setClientFilter("all");
                setSourceFilter("all");
                setSeverityFilter("all");
                setStatusFilter("all");
                setActiveKpiFilter(null);
              }}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Detected Issues</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredIssues.length}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Click any row to inspect configuration drift
          </span>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              No matching issues found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Your infrastructure is aligned with expected rules or matches your filter query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Severity</th>
                  <th className="py-3 px-4">Mailbox / Domain</th>
                  <th className="py-3 px-4">Issue Category</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Setting Drift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Detected</th>
                  <th className="py-3 px-4 w-12 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIssues.map((issue) => {
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
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <div className="flex items-center gap-2">
                          {issue.item.includes("@") ? (
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[220px]">
                            {issue.item}
                          </span>
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
                          <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 truncate max-w-[110px]">
                            {issue.currentValue}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[110px]">
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
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
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
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors shadow-sm"
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
                  <span className="font-semibold text-slate-800">
                    {selectedIssue.detectedAt}
                  </span>
                </div>
              </div>

              {/* Actionable Resolution Guidance */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-950">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Resolution Recommendation
                </span>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Log in to your {selectedIssue.source} dashboard for &ldquo;
                  {selectedIssue.item}&rdquo; and adjust the setting from{" "}
                  <strong className="text-rose-700">{selectedIssue.currentValue}</strong> to{" "}
                  <strong className="text-emerald-700">{selectedIssue.expectedValue}</strong>.
                  Then trigger &ldquo;Scan Now&rdquo; to automatically verify resolution.
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
  return {
    id: issue.id,
    source: issue.source,
    client: issue.client || "Unassigned",
    issueType: issue.issue_type,
    item: issue.item,
    accountType: issue.account_type || "Unclassified",
    currentValue: issue.current_value || "Not available",
    expectedValue: issue.expected_value || "Not available",
    severity: issue.severity,
    status: issue.status,
    detectedAt: formatDateTime(issue.first_seen_at),
    firstSeenAt: formatDateTime(issue.first_seen_at),
    lastSeenAt: formatDateTime(issue.last_seen_at),
    resolvedAt: issue.resolved_at ? formatDateTime(issue.resolved_at) : null,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
