"use client";

import Link from "next/link";
import {
  Building2,
  Mail,
  Megaphone,
  CheckCircle2,
  TriangleAlert,
  ArrowLeft,
  ShieldCheck,
  Server,
  Layers,
  Flame,
  Globe,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export type ClientCampaign = {
  id: string;
  name: string;
  status: string;
  accounts: number | null;
  activeSince: string;
};

export type ClientIssue = {
  id: string;
  type: string;
  item: string;
  severity: "Warning" | "Critical";
};

export type ClientDetailData = {
  id: string;
  name: string;
  totalAccounts: number;
  healthyAccounts: number;
  issues: number;
  activeCampaigns: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  campaigns: ClientCampaign[];
  recentIssues: ClientIssue[];
};

export default function ClientDetailPage({
  client,
}: {
  client: ClientDetailData;
}) {
  const healthRate =
    client.totalAccounts > 0
      ? Math.round((client.healthyAccounts / client.totalAccounts) * 100)
      : 100;

  const initials = getInitials(client.name);

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Back Navigation Bar */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients Directory</span>
        </Link>
      </div>

      {/* Client Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/70 via-slate-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white font-extrabold flex items-center justify-center text-lg shadow-md shrink-0">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  {client.name}
                </h1>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    client.issues === 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {client.issues === 0 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Optimal Health</span>
                    </>
                  ) : (
                    <>
                      <TriangleAlert className="w-3 h-3 text-amber-600" />
                      <span>{client.issues} Issues Flagged</span>
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500">
                Live mailbox inventory, account types, sequence campaigns, and detected drift anomalies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <Link
              href="/emailaccounts"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Inboxes</span>
            </Link>

            <Link
              href="/issues"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10 active:scale-95"
            >
              <TriangleAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit Issues</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Summary Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Inboxes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Inboxes
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {client.totalAccounts.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Assigned sending accounts</p>
          </div>
        </div>

        {/* Healthy Accounts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Compliant Inboxes
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
              {client.healthyAccounts.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Within rule bounds</p>
          </div>
        </div>

        {/* Need Attention */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Need Attention
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <TriangleAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                client.issues > 0 ? "text-amber-700" : "text-slate-900"
              }`}
            >
              {client.issues.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active drift issues</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-950">
              {client.activeCampaigns.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sequences live</p>
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Health Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                healthRate >= 95
                  ? "text-emerald-700"
                  : healthRate >= 80
                  ? "text-amber-700"
                  : "text-rose-700"
              }`}
            >
              {healthRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Compliance rating</p>
          </div>
        </div>
      </div>

      {/* Account Types Distribution Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Infrastructure Account Types</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mailbox distribution across provisioned infrastructure providers for {client.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <TypeDistributionCard
            title="Hypertide Azure / Entra"
            value={client.azureEntra}
            total={client.totalAccounts}
            accentColor="indigo"
          />

          <TypeDistributionCard
            title="Hypertide Google"
            value={client.hypertideGoogle}
            total={client.totalAccounts}
            accentColor="amber"
          />

          <TypeDistributionCard
            title="Google Workspace"
            value={client.googleWorkspace}
            total={client.totalAccounts}
            accentColor="purple"
          />
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <span>Outreach Campaigns</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live sequences mapped to {client.name}
            </p>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {client.campaigns.length} campaigns
          </span>
        </div>

        {client.campaigns.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No active campaigns found for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Campaign Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Accounts</th>
                  <th className="py-3 px-6 text-right">Active Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {client.campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {camp.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <CampaignStatusBadge status={camp.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {camp.accounts === null ? "—" : `${camp.accounts.toLocaleString()} inboxes`}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500 font-medium">
                      {camp.activeSince}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Current Issues Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-amber-500" />
              <span>Current Issues & Drift Flags</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Open items requiring resolution for {client.name}
            </p>
          </div>

          <Link
            href="/issues"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Inspect All Issues</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {client.recentIssues.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">All inboxes compliant</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              No open configuration drift or deliverability issues detected for {client.name}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {client.recentIssues.map((issue) => {
              const isCritical = issue.severity === "Critical";
              return (
                <div
                  key={issue.id}
                  className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                        isCritical
                          ? "bg-rose-100 text-rose-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isCritical ? <Flame className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {issue.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCritical
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Resource: <span className="font-semibold text-slate-700">{issue.item}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/issues"
                    className="self-start sm:self-auto inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Inspect Issue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TypeDistributionCard({
  title,
  value,
  total,
  accentColor,
}: {
  title: string;
  value: number;
  total: number;
  accentColor: "indigo" | "amber" | "purple";
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  const barColor =
    accentColor === "indigo"
      ? "bg-indigo-600"
      : accentColor === "amber"
      ? "bg-amber-500"
      : "bg-purple-600";

  return (
    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">{title}</span>
        <span className="font-extrabold text-slate-900">{value.toLocaleString()} inboxes</span>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="text-[11px] text-slate-400">
        {percent}% of total client fleet
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const norm = status.trim().toUpperCase();

  if (norm === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        ACTIVE
      </span>
    );
  }
  if (norm === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        PAUSED
      </span>
    );
  }
  if (norm === "STOPPED" || norm === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        STOPPED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
      {norm}
    </span>
  );
}

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "UA";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
