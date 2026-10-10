"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  PlayCircle,
  PauseCircle,
  StopCircle,
  CheckCircle2,
  Search,
  X,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Mail,
  Calendar,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Radio,
  FileText,
} from "lucide-react";
import { cleanClientName } from "@/lib/utils";

type RawData = Record<string, unknown>;

type IntegrationRelation =
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

export type RealCampaign = {
  id: string;
  external_id: number;
  name: string | null;
  status: string | null;
  first_seen_active_at: string | null;
  raw_data: RawData | null;
  synced_at: string;
  integration_id: string;
  integrations: IntegrationRelation;
};

export type DisplayCampaign = {
  id: string;
  externalId: number;
  name: string;
  client: string;
  smartlead: string;
  status: string;
  accounts: number | null;
  activeSince: string | null;
  lastSynced: string | null;
  rawData: RawData | null;
};

type SortField = "name" | "client" | "status" | "accounts" | "activeSince" | "lastSynced";
type SortOrder = "asc" | "desc";

function createClientId(value: string) {
  const id = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "unassigned";
}

export default function CampaignsPageClient({
  realCampaigns,
  clientNamesById,
}: {
  realCampaigns: RealCampaign[];
  clientNamesById: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [smartleadFilter, setSmartleadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectedCampaign, setInspectedCampaign] = useState<DisplayCampaign | null>(null);

  const campaigns = useMemo(
    () =>
      realCampaigns.map((campaign) =>
        convertRealCampaign(campaign, clientNamesById)
      ),
    [realCampaigns, clientNamesById]
  );

  const clients = useMemo(
    () =>
      Array.from(
        new Set(
          campaigns
            .map((campaign) => campaign.client)
            .filter((client) => client !== "Unassigned")
        )
      ).sort(),
    [campaigns]
  );

  const smartleads = useMemo(
    () =>
      Array.from(new Set(campaigns.map((campaign) => campaign.smartlead))).sort(),
    [campaigns]
  );

  const statuses = useMemo(
    () => Array.from(new Set(campaigns.map((campaign) => campaign.status))).sort(),
    [campaigns]
  );

  const activeCount = useMemo(
    () => campaigns.filter((c) => c.status === "ACTIVE").length,
    [campaigns]
  );

  const pausedCount = useMemo(
    () => campaigns.filter((c) => c.status === "PAUSED").length,
    [campaigns]
  );

  const stoppedCount = useMemo(
    () => campaigns.filter((c) => c.status === "STOPPED").length,
    [campaigns]
  );

  const completedCount = useMemo(
    () => campaigns.filter((c) => c.status === "COMPLETED").length,
    [campaigns]
  );

  const draftCount = useMemo(
    () =>
      campaigns.filter((c) => c.status === "DRAFT" || c.status === "DRAFTED").length,
    [campaigns]
  );

  const otherCount =
    campaigns.length -
    activeCount -
    pausedCount -
    stoppedCount -
    completedCount -
    draftCount;

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    const value = search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch =
        !value ||
        campaign.name.toLowerCase().includes(value) ||
        campaign.client.toLowerCase().includes(value) ||
        String(campaign.externalId).includes(value);

      const matchesClient =
        clientFilter === "all" || campaign.client === clientFilter;

      const matchesSmartlead =
        smartleadFilter === "all" || campaign.smartlead === smartleadFilter;

      const matchesStatus =
        statusFilter === "all" || campaign.status === statusFilter;

      return (
        matchesSearch &&
        matchesClient &&
        matchesSmartlead &&
        matchesStatus
      );
    });
  }, [
    campaigns,
    search,
    clientFilter,
    smartleadFilter,
    statusFilter,
  ]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    const sorted = [...filteredCampaigns];

    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "client":
          cmp = a.client.localeCompare(b.client);
          break;
        case "accounts":
          cmp = (a.accounts ?? -1) - (b.accounts ?? -1);
          break;
        case "activeSince":
          cmp = (a.activeSince || "").localeCompare(b.activeSince || "");
          break;
        case "lastSynced":
          cmp = (a.lastSynced || "").localeCompare(b.lastSynced || "");
          break;
        case "status": {
          const rank = (s: string) => {
            if (s === "ACTIVE") return 1;
            if (s === "PAUSED") return 2;
            if (s === "STOPPED") return 3;
            if (s === "COMPLETED") return 4;
            return 5;
          };
          cmp = rank(a.status) - rank(b.status);
          break;
        }
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [filteredCampaigns, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedCampaigns.length / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedCampaigns.slice(startIndex, startIndex + pageSize);
  }, [sortedCampaigns, currentPage, pageSize]);

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleCopyId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "accounts" || field === "activeSince" ? "desc" : "asc");
    }
  };

  const isFilterActive =
    search !== "" ||
    clientFilter !== "all" ||
    smartleadFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setClientFilter("all");
    setSmartleadFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-w-0 max-w-[1440px] mx-auto pb-16 space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight text-[#14243D]">
              Campaigns
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="mt-1 text-[12px] font-normal text-slate-500">
            Monitor Smartlead outreach campaigns, sender mailbox allocation, and active execution status.
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-slate-700 bg-slate-100/80 rounded-lg border border-slate-200/70">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            {campaigns.length} Main Campaigns
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Total Campaigns</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#14243D] tabular-nums">
              {campaigns.length.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">total</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Across {clients.length} clients
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Active</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#10B981] tabular-nums">
              {activeCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-[#10B981]">
              {campaigns.length > 0 ? Math.round((activeCount / campaigns.length) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Currently sending
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Paused</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#F59E0B] tabular-nums">
              {pausedCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">paused</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Temporarily on hold
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Stopped</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <StopCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-slate-800 tabular-nums">
              {stoppedCount.toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">stopped</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            Ended or deactivated
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#8B5CF6]">
            <span className="text-[12px] font-normal tracking-wide text-slate-500">Draft / Completed</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-[#8B5CF6]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-tight text-[#8B5CF6] tabular-nums">
              {(completedCount + draftCount + otherCount).toLocaleString()}
            </span>
            <span className="text-[12px] font-normal text-slate-400">other</span>
          </div>
          <div className="mt-2 text-[12px] font-normal text-slate-400">
            {completedCount} completed · {draftCount} draft
          </div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              placeholder="Search campaign name, client, or ID..."
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
          <div className="lg:col-span-3">
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

          {/* Smartlead Integration Filter */}
          <div className="lg:col-span-2">
            <select
              value={smartleadFilter}
              onChange={(e) => {
                setSmartleadFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition"
            >
              <option value="all">All Integrations</option>
              {smartleads.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition font-medium"
            >
              <option value="all">All Statuses ({statuses.length})</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills Quick Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => {
              setStatusFilter("all");
              handleFilterChange();
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({campaigns.length})
          </button>
          <button
            onClick={() => {
              setStatusFilter(statusFilter === "ACTIVE" ? "all" : "ACTIVE");
              handleFilterChange();
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer inline-flex items-center gap-1 ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/60"
            }`}
          >
            <PlayCircle className="w-3 h-3" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => {
              setStatusFilter(statusFilter === "PAUSED" ? "all" : "PAUSED");
              handleFilterChange();
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer inline-flex items-center gap-1 ${
              statusFilter === "PAUSED"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200/60"
            }`}
          >
            <PauseCircle className="w-3 h-3" />
            Paused ({pausedCount})
          </button>
          <button
            onClick={() => {
              setStatusFilter(statusFilter === "STOPPED" ? "all" : "STOPPED");
              handleFilterChange();
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer inline-flex items-center gap-1 ${
              statusFilter === "STOPPED"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200/60"
            }`}
          >
            <StopCircle className="w-3 h-3" />
            Stopped ({stoppedCount})
          </button>
          {completedCount > 0 && (
            <button
              onClick={() => {
                setStatusFilter(statusFilter === "COMPLETED" ? "all" : "COMPLETED");
                handleFilterChange();
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer inline-flex items-center gap-1 ${
                statusFilter === "COMPLETED"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Completed ({completedCount})
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
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
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                <th
                  onClick={() => toggleSort("name")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "28%" }}
                >
                  <div className="flex items-center gap-1.5">
                    Campaign Name
                    <SortIcon field="name" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("client")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "16%" }}
                >
                  <div className="flex items-center gap-1.5">
                    Client
                    <SortIcon field="client" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th className="py-3 px-3" style={{ width: "14%" }}>
                  Integration
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "11%" }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status
                    <SortIcon field="status" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("accounts")}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "10%" }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Mailboxes
                    <SortIcon field="accounts" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("activeSince")}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
                  style={{ width: "11%" }}
                >
                  <div className="flex items-center gap-1">
                    Active Since
                    <SortIcon field="activeSince" currentField={sortField} order={sortOrder} />
                  </div>
                </th>
                <th className="py-3 px-3 text-center" style={{ width: "6%" }}>
                  Inspect
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px] font-normal">
              {paginatedCampaigns.length > 0 ? (
                paginatedCampaigns.map((campaign) => (
                  <CampaignTableRow
                    key={campaign.id}
                    campaign={campaign}
                    copiedId={copiedId}
                    onCopyId={handleCopyId}
                    onInspect={() => setInspectedCampaign(campaign)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No campaigns found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try adjusting your search criteria, client filter, or status filter.
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-200/80 gap-3">
            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
              {" · "}
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, sortedCampaigns.length)} of {sortedCampaigns.length} campaigns
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

      {/* Campaign Details Drawer */}
      {inspectedCampaign && (
        <CampaignInspectDrawer
          campaign={inspectedCampaign}
          onClose={() => setInspectedCampaign(null)}
          onCopyId={handleCopyId}
          copiedId={copiedId}
        />
      )}
    </div>
  );
}

/* Campaign Table Row */
function CampaignTableRow({
  campaign,
  copiedId,
  onCopyId,
  onInspect,
}: {
  campaign: DisplayCampaign;
  copiedId: string | null;
  onCopyId: (id: string) => void;
  onInspect: () => void;
}) {
  const hasClient = campaign.client && campaign.client !== "Unassigned";

  return (
    <tr className="hover:bg-blue-50/30 transition-colors group">
      {/* Campaign Name */}
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <div
            className="truncate font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors max-w-[280px]"
            title={campaign.name}
          >
            {campaign.name}
          </div>
          <button
            onClick={() => onCopyId(String(campaign.externalId))}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
            title="Copy Smartlead Campaign ID"
          >
            {copiedId === String(campaign.externalId) ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
          <span>ID #{campaign.externalId}</span>
        </div>
      </td>

      {/* Client */}
      <td className="py-2.5 px-3">
        {hasClient ? (
          <Link
            href={`/clients/${createClientId(campaign.client)}`}
            className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-[#2563EB] hover:underline max-w-[180px] truncate"
            title={`View client ${campaign.client}`}
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{campaign.client}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
            Unassigned
          </span>
        )}
      </td>

      {/* Integration */}
      <td className="py-2.5 px-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 max-w-[150px] truncate">
          {campaign.smartlead}
        </span>
      </td>

      {/* Status */}
      <td className="py-2.5 px-3 text-center">
        <CampaignStatusBadge status={campaign.status} />
      </td>

      {/* Mailboxes / Accounts */}
      <td className="py-2.5 px-3 text-center">
        {campaign.accounts !== null ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            <Mail className="w-3 h-3 text-slate-400" />
            {campaign.accounts}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Active Since */}
      <td className="py-2.5 px-3">
        {campaign.activeSince ? (
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{formatDate(campaign.activeSince)}</span>
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Inspect */}
      <td className="py-2.5 px-3 text-center">
        <button
          onClick={onInspect}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 transition cursor-pointer"
          title="Inspect campaign settings"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

/* Status Badge */
function CampaignStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }

  if (status === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300/80 shadow-2xs">
        <PauseCircle className="w-3 h-3 text-amber-500" />
        Paused
      </span>
    );
  }

  if (status === "STOPPED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
        <StopCircle className="w-3 h-3 text-rose-500" />
        Stopped
      </span>
    );
  }

  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3 h-3 text-slate-500" />
        Completed
      </span>
    );
  }

  if (status === "DRAFT" || status === "DRAFTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <FileText className="w-3 h-3 text-blue-500" />
        Draft
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {status}
    </span>
  );
}

/* Campaign Inspection Slide-Over Drawer */
function CampaignInspectDrawer({
  campaign,
  onClose,
  onCopyId,
  copiedId,
}: {
  campaign: DisplayCampaign;
  onClose: () => void;
  onCopyId: (id: string) => void;
  copiedId: string | null;
}) {
  const raw = campaign.rawData || {};
  const hasClient = campaign.client && campaign.client !== "Unassigned";

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
                {campaign.name}
              </h2>
              <button
                onClick={() => onCopyId(String(campaign.externalId))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                title="Copy Campaign ID"
              >
                {copiedId === String(campaign.externalId) ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{campaign.smartlead}</span>
              <span>·</span>
              <span>Smartlead ID #{campaign.externalId}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status banner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Campaign Execution Status
              </div>
              <div className="mt-1 font-bold text-base text-slate-900">
                {campaign.status}
              </div>
            </div>
            <CampaignStatusBadge status={campaign.status} />
          </div>

          {/* Key Campaign Metrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Assigned Resources
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Sender Mailboxes</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  {campaign.accounts !== null ? campaign.accounts : "—"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Mailboxes attached
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Active Since</span>
                <span className="text-sm font-bold text-slate-900 mt-1.5 block">
                  {campaign.activeSince ? formatDate(campaign.activeSince) : "—"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  First active sync
                </span>
              </div>
            </div>
          </div>

          {/* Client & Ownership Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Ownership & Integration
            </h3>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Client:</span>
                {hasClient ? (
                  <Link
                    href={`/clients/${createClientId(campaign.client)}`}
                    className="font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    {campaign.client}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-slate-400 font-medium">Unassigned</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Integration:</span>
                <span className="font-semibold text-slate-800">
                  {campaign.smartlead}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Last Synced:</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {campaign.lastSynced ? formatDateTime(campaign.lastSynced) : "—"}
                </span>
              </div>

              {raw.created_at ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Created in Smartlead:</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(String(raw.created_at))}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Configuration Parameters from Raw Data */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Smartlead Campaign Configuration
            </h3>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600">Stop on Lead Reply:</span>
                <span className="font-bold text-slate-800">
                  {raw.stop_on_lead_reply === true
                    ? "Enabled"
                    : raw.stop_on_lead_reply === false
                    ? "Disabled"
                    : "Default"}
                </span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600">Send as Plain Text:</span>
                <span className="font-bold text-slate-800">
                  {raw.send_as_plain_text === true ? "Yes" : "No"}
                </span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600">Schedule / Timezone:</span>
                <span className="font-bold text-slate-800">
                  {raw.timezone ? String(raw.timezone) : "Account Default"}
                </span>
              </div>

              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600">Parent Campaign ID:</span>
                <span className="font-medium text-slate-500">
                  {raw.parent_campaign_id ? String(raw.parent_campaign_id) : "None (Main Campaign)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          {hasClient && (
            <Link
              href={`/clients/${createClientId(campaign.client)}`}
              className="px-3.5 py-2 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              View Client
            </Link>
          )}
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

/* Conversion Helpers */
function convertRealCampaign(
  campaign: RealCampaign,
  clientNamesById: Record<string, string>
): DisplayCampaign {
  const raw = campaign.raw_data || {};
  const integration = Array.isArray(campaign.integrations)
    ? campaign.integrations[0]
    : campaign.integrations;

  return {
    id: campaign.id,
    externalId: campaign.external_id,
    name: campaign.name || `Campaign ${campaign.external_id}`,
    client: getCampaignClient(raw, clientNamesById),
    smartlead: integration?.name || "Smartlead",
    status: normalizeStatus(campaign.status),
    accounts: getCampaignAccountCount(raw),
    activeSince: campaign.first_seen_active_at,
    lastSynced: campaign.synced_at,
    rawData: raw,
  };
}

function getCampaignClient(
  raw: RawData,
  clientNamesById: Record<string, string>
) {
  const directName = getText(raw.client_name) || getText(raw.clientName);
  if (directName) return cleanClientName(directName);

  if (typeof raw.client === "string") {
    const client = getText(raw.client);
    if (client) return cleanClientName(client);
  }

  const clientObject = asObject(raw.client);
  const objectName =
    getText(clientObject.name) ||
    getText(clientObject.client_name) ||
    getText(clientObject.company_name);
  if (objectName) return cleanClientName(objectName);

  const clientId = getId(raw.client_id) || getId(raw.clientId);
  if (clientId && clientNamesById[clientId]) {
    return cleanClientName(clientNamesById[clientId]);
  }

  return "Unassigned";
}

function getCampaignAccountCount(raw: RawData) {
  const possibleArrays = [
    raw.email_account_ids,
    raw.emailAccountIds,
    raw.email_accounts,
    raw.emailAccounts,
    raw.sender_account_ids,
    raw.sender_accounts,
    raw.senderAccounts,
    raw.senders,
  ];

  for (const value of possibleArrays) {
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  const directValues = [
    raw.email_account_count,
    raw.email_accounts_count,
    raw.account_count,
    raw.accounts_count,
    raw.sender_count,
  ];

  for (const value of directValues) {
    const number = getNumber(value);
    if (number !== null) {
      return number;
    }
  }

  return null;
}

function normalizeStatus(value: string | null) {
  if (!value) return "UNKNOWN";
  return value.trim().toUpperCase();
}

function asObject(value: unknown): RawData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RawData;
  }
  return {};
}

function getText(value: unknown) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result || null;
}

function getId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const id = String(value).trim();
  return id || null;
}

function getNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}