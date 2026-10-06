"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  TriangleAlert,
  Search,

  Eye,
  Clock,
  Zap,
  ShieldCheck,

  X,
  List,

  Activity,

} from "lucide-react";
import { activityDemoData } from "@/lib/activityDemoData";

export type SyncLog = {
  id: string;
  provider: string;
  accounts_fetched: number;
  campaigns_fetched: number;
  active_campaigns: number;
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

export type ActivityStatus = "Success" | "Warning" | "Failed";

export type ActivityRecord = {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  status: ActivityStatus;
  createdAt: string;
  live: boolean;
  metadata?: Record<string, unknown>;
};

export default function ActivityPageClient({
  syncLogs = [],
  issues = [],
}: {
  syncLogs?: SyncLog[];
  issues?: Issue[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);

  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);

  const hasLiveData = syncLogs.length > 0 || issues.length > 0;

  const activities = useMemo<ActivityRecord[]>(() => {
    if (!hasLiveData) {
      return activityDemoData.map((activity, index) => ({
        id: activity.id || `demo-${index}`,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        source: activity.source,
        status: activity.status,
        createdAt: demoDateFromLabel(activity.date, activity.time),
        live: false,
      }));
    }

    const rows: ActivityRecord[] = [];

    for (const log of syncLogs) {
      const provider = formatProvider(log.provider);
      const success = log.status.toLowerCase() === "success";

      rows.push({
        id: `sync-${log.id}`,
        type: "Sync",
        title: success
          ? `${provider} Sync Completed`
          : `${provider} Sync Failed`,
        description: success
          ? buildSyncDescription(log)
          : log.message || "The sync could not be completed.",
        source: provider,
        status: success ? "Success" : "Failed",
        createdAt: log.created_at,
        live: true,
        metadata: {
          accountsFetched: log.accounts_fetched,
          campaignsFetched: log.campaigns_fetched,
          activeCampaigns: log.active_campaigns,
          rawStatus: log.status,
          message: log.message,
        },
      });
    }

    for (const issue of issues) {
      rows.push({
        id: `issue-open-${issue.id}`,
        type: "Issue Found",
        title: issue.issue_type,
        description: buildIssueDescription(issue),
        source: issue.source,
        status: issue.severity === "Critical" ? "Failed" : "Warning",
        createdAt: issue.first_seen_at,
        live: true,
        metadata: {
          item: issue.item,
          client: issue.client,
          severity: issue.severity,
          status: issue.status,
          firstSeen: issue.first_seen_at,
          lastSeen: issue.last_seen_at,
        },
      });

      if (issue.status === "Resolved" && issue.resolved_at) {
        rows.push({
          id: `issue-resolved-${issue.id}`,
          type: "Issue Resolved",
          title: `${issue.issue_type} Resolved`,
          description: `${issue.item} is no longer showing this issue.`,
          source: issue.source,
          status: "Success",
          createdAt: issue.resolved_at,
          live: true,
          metadata: {
            item: issue.item,
            client: issue.client,
            resolvedAt: issue.resolved_at,
          },
        });
      }
    }

    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [hasLiveData, syncLogs, issues]);

  const types = useMemo(() => {
    return Array.from(new Set(activities.map((item) => item.type)));
  }, [activities]);

  const sources = useMemo(() => {
    return Array.from(new Set(activities.map((item) => item.source)));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const value = search.trim().toLowerCase();

    return activities.filter((activity) => {
      // Interactive KPI filters
      if (activeKpiFilter === "today" && !isToday(activity.createdAt)) return false;
      if (activeKpiFilter === "success" && activity.status !== "Success") return false;
      if (activeKpiFilter === "warning" && activity.status !== "Warning") return false;
      if (activeKpiFilter === "failed" && activity.status !== "Failed") return false;

      const matchesSearch =
        !value ||
        activity.title.toLowerCase().includes(value) ||
        activity.description.toLowerCase().includes(value) ||
        activity.source.toLowerCase().includes(value) ||
        activity.type.toLowerCase().includes(value);

      const matchesType = typeFilter === "all" || activity.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || activity.status === statusFilter;
      const matchesSource =
        sourceFilter === "all" || activity.source === sourceFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSource;
    });
  }, [activities, search, typeFilter, statusFilter, sourceFilter, activeKpiFilter]);

  const todayCount = activities.filter((a) => isToday(a.createdAt)).length;
  const successfulCount = activities.filter((a) => a.status === "Success").length;
  const warningsCount = activities.filter((a) => a.status === "Warning").length;
  const failedCount = activities.filter((a) => a.status === "Failed").length;

  function toggleKpiFilter(filter: string) {
    setActiveKpiFilter((curr) => (curr === filter ? null : filter));
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Top Action & Mode Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Infrastructure Activity Log
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                hasLiveData
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {hasLiveData ? "Live Pipeline" : "Demo Simulation"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Audit sync runs, mailbox health events, domain alerts, and incident resolutions.
          </p>
        </div>

        {/* View Switcher Controls (Table vs Timeline) */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "timeline"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline Feed</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => toggleKpiFilter("today")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "today"
              ? "border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Today&apos;s Events
            </span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {todayCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Recorded in past 24h</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("success")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "success"
              ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Successful
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1.5">
            {successfulCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Syncs & resolutions</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("warning")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "warning"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Warnings
            </span>
            <TriangleAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1.5">
            {warningsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Require review</p>
        </div>

        <div
          onClick={() => toggleKpiFilter("failed")}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
            activeKpiFilter === "failed"
              ? "border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
              : "border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Failed
            </span>
            <TriangleAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1.5">
            {failedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Critical errors</p>
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
            placeholder="Search activity by title, client, or details..."
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
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
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
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Success">Success</option>
            <option value="Warning">Warning</option>
            <option value="Failed">Failed</option>
          </select>

          {/* Clear Filters Button if active */}
          {(search ||
            typeFilter !== "all" ||
            sourceFilter !== "all" ||
            statusFilter !== "all" ||
            activeKpiFilter !== null) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setSourceFilter("all");
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

      {/* Main Content: Table View or Timeline View */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Table Header Bar */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Activity Records
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredActivities.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Click any row to view complete details
            </span>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Activity className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No matching activity records found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Try widening your search terms or resetting the filter options.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5 w-12 text-center">Type</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4 hidden md:table-cell">Details</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 w-12 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredActivities.map((activity) => (
                    <tr
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                    >
                      {/* Type Icon */}
                      <td className="py-3.5 px-5 text-center">
                        <TypeIcon type={activity.type} />
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <div className="truncate max-w-[260px]">
                          {activity.title}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-500 hidden md:table-cell">
                        <div className="truncate max-w-[340px]">
                          {activity.description}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <SourceBadge source={activity.source} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusPill status={activity.status} />
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </td>

                      {/* View Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity(activity);
                          }}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Activity Timeline Feed</span>
            </h3>
            <span className="text-xs text-slate-500">
              {filteredActivities.length} items logged
            </span>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No activities found for current filters.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="relative group cursor-pointer"
                >
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 top-1 transform -translate-x-1/2 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-300 group-hover:border-indigo-600 flex items-center justify-center transition-colors shadow-sm">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activity.status === "Success"
                            ? "bg-emerald-500"
                            : activity.status === "Warning"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Timeline Card */}
                  <div className="ml-3 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {activity.title}
                        </span>
                        <SourceBadge source={activity.source} />
                        <StatusPill status={activity.status} />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div
          onClick={() => setSelectedActivity(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <TypeIcon type={selectedActivity.type} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {selectedActivity.type}
                    </span>
                    <SourceBadge source={selectedActivity.source} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedActivity.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Status & Time Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Event Status
                  </span>
                  <StatusPill status={selectedActivity.status} />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    Timestamp
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {formatDateTime(selectedActivity.createdAt)}
                  </span>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Summary Description
                </span>
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  {selectedActivity.description}
                </div>
              </div>

              {/* Specific metadata breakdown */}
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Structured Log Metadata
                  </span>
                  <div className="space-y-1.5 bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto">
                    {Object.entries(selectedActivity.metadata).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">{key}:</span>
                        <span className="text-emerald-400 font-semibold truncate">
                          {String(val ?? "null")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeIcon({
  type,
  size = "md",
}: {
  type: string;
  size?: "md" | "lg";
}) {
  const isLg = size === "lg";
  const boxClass = isLg ? "w-10 h-10 rounded-xl" : "w-8 h-8 rounded-lg";
  const iconSize = isLg ? "w-5 h-5" : "w-4 h-4";

  if (type === "Issue Found") {
    return (
      <div
        className={`${boxClass} bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center`}
      >
        <TriangleAlert className={iconSize} />
      </div>
    );
  }

  if (type === "Issue Resolved") {
    return (
      <div
        className={`${boxClass} bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center`}
      >
        <CheckCircle2 className={iconSize} />
      </div>
    );
  }

  return (
    <div
      className={`${boxClass} bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center`}
    >
      <RefreshCw className={iconSize} />
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isSmartlead = source.toLowerCase().includes("smartlead");
  const isEmailguard = source.toLowerCase().includes("emailguard");

  if (isSmartlead) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
        <Zap className="w-2.5 h-2.5 text-orange-500" />
        Smartlead
      </span>
    );
  }

  if (isEmailguard) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
        EmailGuard
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
      {source}
    </span>
  );
}

function StatusPill({ status }: { status: ActivityStatus }) {
  if (status === "Success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Success
      </span>
    );
  }

  if (status === "Warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Warning
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Failed
    </span>
  );
}

function buildSyncDescription(log: SyncLog) {
  const parts = [
    `${Number(log.accounts_fetched || 0).toLocaleString()} accounts`,
    `${Number(log.campaigns_fetched || 0).toLocaleString()} campaigns`,
    `${Number(log.active_campaigns || 0).toLocaleString()} active`,
  ];
  return parts.join(" · ");
}

function buildIssueDescription(issue: Issue) {
  const client = issue.client || "Unassigned";
  return `${issue.item} · ${client} · ${issue.severity}`;
}

function formatProvider(value: string) {
  const lower = value.toLowerCase();
  if (lower === "smartlead") return "Smartlead";
  if (lower === "emailguard") return "EmailGuard";
  return value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function demoDateFromLabel(dateLabel: string, timeLabel: string) {
  const now = new Date();
  const date = new Date(now);

  if (dateLabel === "Yesterday") {
    date.setDate(date.getDate() - 1);
  }

  const match = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    date.setHours(hour, minute, 0, 0);
  }

  return date.toISOString();
}