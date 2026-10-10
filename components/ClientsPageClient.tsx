"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  Megaphone,
  CheckCircle2,
  TriangleAlert,
  Search,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  Sparkles,
  Info,
  Server,
  Layers,
  Zap,
} from "lucide-react";
import { getCleanInitials } from "@/lib/clientUtils";

export type ClientIntegrationBreakdown = {
  name: string;
  count: number;
};

export type ClientSummary = {
  id: string;
  name: string;
  totalAccounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  activeCampaigns: number;
  healthyAccounts: number;
  issues: number;
  integrations: ClientIntegrationBreakdown[];
};

type SortField = "accounts" | "name" | "campaigns" | "issues" | "health";
type SortOrder = "asc" | "desc";

export default function ClientsPageClient({
  clients,
}: {
  clients: ClientSummary[];
}) {
  const [search, setSearch] = useState("");
  const [smartleadFilter, setSmartleadFilter] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<"all" | "healthy" | "issues" | "highVolume">("all");
  const [sortField, setSortField] = useState<SortField>("accounts");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Single-pass computation for summary metrics
  const { totalAccounts, totalCampaigns, totalIssues, clientsWithIssues } = useMemo(() => {
    let accs = 0;
    let camps = 0;
    let iss = 0;
    let withIssues = 0;

    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      accs += c.totalAccounts;
      camps += c.activeCampaigns;
      iss += c.issues;
      if (c.issues > 0) withIssues++;
    }

    return {
      totalAccounts: accs,
      totalCampaigns: camps,
      totalIssues: iss,
      clientsWithIssues: withIssues,
    };
  }, [clients]);

  // Aggregate Smartlead connections
  const smartleadDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      for (const int of c.integrations || []) {
        map.set(int.name, (map.get(int.name) || 0) + int.count);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const overallHealthRate = totalAccounts > 0
    ? Math.round(((totalAccounts - totalIssues) / totalAccounts) * 100)
    : 100;

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matched = clients.filter((client) => {
      const health = client.totalAccounts > 0
        ? Math.round((client.healthyAccounts / client.totalAccounts) * 100)
        : 100;

      // Smartlead integration filter
      if (smartleadFilter !== "all") {
        const hasInt = client.integrations?.some(
          (i) => i.name === smartleadFilter && i.count > 0
        );
        if (!hasInt) return false;
      }

      if (filterMode === "healthy" && health < 98) return false;
      if (filterMode === "issues" && client.issues === 0) return false;
      if (filterMode === "highVolume" && client.totalAccounts < 50) return false;

      if (q && !client.name.toLowerCase().includes(q)) return false;

      return true;
    });

    return matched.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "campaigns") {
        cmp = b.activeCampaigns - a.activeCampaigns;
      } else if (sortField === "issues") {
        cmp = b.issues - a.issues;
      } else if (sortField === "health") {
        const healthA = a.totalAccounts > 0 ? (a.healthyAccounts / a.totalAccounts) : 1;
        const healthB = b.totalAccounts > 0 ? (b.healthyAccounts / b.totalAccounts) : 1;
        cmp = healthB - healthA;
      } else {
        cmp = b.totalAccounts - a.totalAccounts;
      }

      return sortOrder === "asc" ? -cmp : cmp;
    });
  }, [clients, search, smartleadFilter, filterMode, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  function getInitials(name: string) {
    return getCleanInitials(name);
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/80 via-slate-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Client Directory & Portfolio
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Live Pipeline Sync
              </span>
            </div>

            <h1 className="text-xl sm:text-[26px] font-semibold tracking-tight text-[#14243D]">
              Managed Client Accounts
            </h1>

            <p className="text-[12px] font-normal text-slate-500 leading-relaxed">
              Track live account distribution, infrastructure types, active sequences, and compliance health grouped across client workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Link
              href="/emailaccounts"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 transition-colors shadow-xs"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>All Mailboxes</span>
            </Link>

            <Link
              href="/campaigns"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10 active:scale-95"
            >
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <span>View Campaigns</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Elevated Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Clients */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal uppercase tracking-wider">
              Total Clients
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-semibold tracking-tight text-[#14243D] tabular-nums">
              {clients.length.toLocaleString()}
            </div>
            <p className="text-[12px] font-normal text-slate-400 mt-0.5">Managed workspaces</p>
          </div>
        </div>

        {/* Total Accounts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal uppercase tracking-wider">
              Total Inboxes
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-semibold tracking-tight text-[#14243D] tabular-nums">
              {totalAccounts.toLocaleString()}
            </div>
            <p className="text-[12px] font-normal text-slate-400 mt-0.5">Across all client fleets</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal uppercase tracking-wider">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-semibold tracking-tight text-[#8B5CF6] tabular-nums">
              {totalCampaigns.toLocaleString()}
            </div>
            <p className="text-[12px] font-normal text-slate-400 mt-0.5">Live outreach sequences</p>
          </div>
        </div>

        {/* Fleet Health Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500">
              Fleet Health
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-semibold tracking-tight text-[#10B981] tabular-nums">
              {overallHealthRate}%
            </div>
            <p className="text-[12px] font-normal text-[#10B981] mt-0.5">Optimal compliance</p>
          </div>
        </div>

        {/* Clients With Issues */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-normal uppercase tracking-wider text-slate-500">
              Clients w/ Issues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <TriangleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-[28px] font-semibold tracking-tight tabular-nums ${
                clientsWithIssues > 0 ? "text-[#F59E0B]" : "text-[#14243D]"
              }`}
            >
              {clientsWithIssues.toLocaleString()}
            </div>
            <p className="text-[12px] font-normal text-slate-400 mt-0.5">
              {totalIssues} open {totalIssues === 1 ? "anomaly" : "anomalies"}
            </p>
          </div>
        </div>
      </div>

      {/* Smartlead Connections Quick Filter Bar */}
      {smartleadDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Smartlead Accounts
              </span>
              <span className="text-[11px] text-slate-400">
                ({smartleadDistribution.length} connected)
              </span>
            </div>
            {smartleadFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setSmartleadFilter("all");
                  setCurrentPage(1);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Reset Smartlead filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSmartleadFilter("all");
                setCurrentPage(1);
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
                {totalAccounts.toLocaleString()}
              </span>
            </button>

            {smartleadDistribution.map((item) => {
              const isSelected = smartleadFilter === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setSmartleadFilter(isSelected ? "all" : item.name);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-2xs"
                      : "bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 text-slate-700 border border-slate-200/70"
                  }`}
                >
                  <Zap className={`w-3 h-3 ${isSelected ? "text-blue-200" : "text-blue-600"}`} />
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search client workspace..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("healthy");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "healthy"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Healthy
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("issues");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "issues"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Needs Review ({clientsWithIssues})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode("highVolume");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === "highVolume"
                ? "bg-white text-indigo-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            &gt;50 Inboxes
          </button>
        </div>
      </div>

      {/* Main Client Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Client Directory</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredAndSortedClients.length} workspaces
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Click any client to inspect mailbox health & campaign detail
          </span>
        </div>

        {filteredAndSortedClients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Building2 className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No clients match your filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Try adjusting your search query or reset your active filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterMode("all");
                setSmartleadFilter("all");
              }}
              className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3 px-6 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Client</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("accounts")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Inboxes</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Account Type Mix</th>
                  <th
                    onClick={() => handleSort("campaigns")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Campaigns</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("issues")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Issues</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("health")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Health Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] font-normal">
                {paginatedClients.map((client) => {
                  const health = client.totalAccounts > 0
                    ? Math.round((client.healthyAccounts / client.totalAccounts) * 100)
                    : 100;
                  const initials = getInitials(client.name);
                  const isUnassigned = client.name === "Unassigned";

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors duration-150 group"
                    >
                      {/* Client Identity */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <Link
                          href={`/clients/${client.id}`}
                          className="flex items-center gap-3 group-hover:text-indigo-600 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-950 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 block text-sm">
                              {client.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                {isUnassigned ? "Uncategorized mailboxes" : "Managed Client"}
                              </span>
                              {client.integrations && client.integrations.length > 0 && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <div className="flex flex-wrap items-center gap-1">
                                    {client.integrations.map((int) => {
                                      const isSelected = smartleadFilter === int.name;
                                      const is1st = int.name.toLowerCase().includes("1st");
                                      return (
                                        <span
                                          key={int.name}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                            isSelected
                                              ? "bg-[#2563EB] text-white border-blue-600 shadow-2xs"
                                              : is1st
                                              ? "bg-blue-50 text-blue-700 border-blue-200/80"
                                              : "bg-indigo-50 text-indigo-700 border-indigo-200/80"
                                          }`}
                                        >
                                          <Zap className={`w-2.5 h-2.5 ${isSelected ? "text-blue-200" : "opacity-80"}`} />
                                          <span>{int.name}</span>
                                          {client.integrations.length > 1 && (
                                            <span className={`text-[9px] ${isSelected ? "text-blue-100" : "opacity-75"} font-normal`}>
                                              ({int.count.toLocaleString()})
                                            </span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Total Accounts */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.totalAccounts.toLocaleString()}</span>
                        </div>
                        {smartleadFilter !== "all" && (
                          <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                            {(client.integrations?.find((i) => i.name === smartleadFilter)?.count || 0).toLocaleString()} in {smartleadFilter}
                          </div>
                        )}
                      </td>

                      {/* Account Type Mix */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {client.azureEntra > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              Azure: {client.azureEntra}
                            </span>
                          )}
                          {client.hypertideGoogle > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                              Hyp Google: {client.hypertideGoogle}
                            </span>
                          )}
                          {client.googleWorkspace > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                              Workspace: {client.googleWorkspace}
                            </span>
                          )}
                          {client.azureEntra === 0 && client.hypertideGoogle === 0 && client.googleWorkspace === 0 && (
                            <span className="text-[11px] text-slate-400">
                              Standard
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Campaigns */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            client.activeCampaigns > 0
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <Megaphone className="w-3 h-3" />
                          <span>{client.activeCampaigns} active</span>
                        </span>
                      </td>

                      {/* Issues */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            client.issues > 0
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {client.issues > 0 ? (
                            <>
                              <TriangleAlert className="w-3 h-3 text-amber-600" />
                              <span>{client.issues} issues</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Clean</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                health >= 95
                                  ? "bg-emerald-500"
                                  : health >= 80
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${health}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              health >= 95
                                ? "text-emerald-700"
                                : health >= 80
                                ? "text-amber-700"
                                : "text-rose-700"
                            }`}
                          >
                            {health}%
                          </span>
                        </div>
                      </td>

                      {/* Action Link */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
                        >
                          <span>View Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Navigation */}
        {filteredAndSortedClients.length > pageSize && (
          <div className="p-4 px-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 text-xs text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-900">
                {(currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, filteredAndSortedClients.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900">
                {filteredAndSortedClients.length}
              </strong>{" "}
              workspaces
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

      {/* Unassigned Guidance Card if relevant */}
      {clients.length === 1 && clients[0]?.name === "Unassigned" && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            Smartlead synced the mailbox data, but no explicit client tag is currently set in the payload. Accounts are grouped under <strong>Unassigned</strong> until client tags are associated in Smartlead.
          </p>
        </div>
      )}
    </div>
  );
}
