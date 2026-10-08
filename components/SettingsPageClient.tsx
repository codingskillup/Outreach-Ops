"use client";

import { useState } from "react";
import {
  Plug,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  Server,
  Zap,
  Lock,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import ConnectionsPageClient, {
  type Integration,
} from "@/components/ConnectionsPageClient";
import NotificationSettingsClient, {
  type Recipient,
} from "@/components/NotificationSettingsClient";
import AccountRulesSettingsClient, {
  type AccountTypeRule,
  type DiscoveredAccountTag,
} from "@/components/AccountRulesSettingsClient";

type Tab = "connections" | "notifications" | "rules";

export default function SettingsPageClient({
  userId,
  integrations,
  recipients,
  discoveredTags,
  rules,
}: {
  userId: string;
  integrations: Integration[];
  recipients: Recipient[];
  discoveredTags: DiscoveredAccountTag[];
  rules: AccountTypeRule[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("connections");

  const activeRecipientsCount = recipients.filter(
    (recipient) => recipient.is_active
  ).length;

  const activeRulesCount = rules.filter((rule) => rule.is_enabled).length;

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Executive Settings Banner / Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
        {/* Subtle decorative gradient glow behind */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/80 via-slate-50/20 to-transparent rounded-full -mr-24 -mt-24 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Operations Control Center
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                AES-256 Vault Secured
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Workspace & Infrastructure Settings
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Manage platform API connections, automated incident notification recipients, and mailbox drift enforcement rules across all client inboxes.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Integrations
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-base font-bold text-slate-900">
                  {integrations.length}
                </span>
                <span className="text-xs text-slate-500">Live</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Alert Recipients
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Bell className="w-3 h-3 text-rose-500" />
                <span className="text-base font-bold text-slate-900">
                  {activeRecipientsCount}
                </span>
                <span className="text-xs text-slate-500">Active</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Rule Profiles
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                <span className="text-base font-bold text-slate-900">
                  {activeRulesCount}
                </span>
                <span className="text-xs text-slate-500">Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Tab 1: Platform Connections */}
          <button
            type="button"
            onClick={() => setActiveTab("connections")}
            className={`flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-200 group ${
              activeTab === "connections"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                activeTab === "connections"
                  ? "bg-white/10 text-white"
                  : "bg-white text-slate-700 group-hover:text-indigo-600 shadow-xs"
              }`}
            >
              <Plug className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-bold truncate ${
                    activeTab === "connections" ? "text-white" : "text-slate-900"
                  }`}
                >
                  Platform Connections
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    activeTab === "connections"
                      ? "bg-white/20 text-white"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  }`}
                >
                  {integrations.length}
                </span>
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  activeTab === "connections"
                    ? "text-slate-300"
                    : "text-slate-500"
                }`}
              >
                Smartlead & EmailGuard APIs
              </p>
            </div>
          </button>

          {/* Tab 2: Email Notifications */}
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-200 group ${
              activeTab === "notifications"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                activeTab === "notifications"
                  ? "bg-white/10 text-white"
                  : "bg-white text-slate-700 group-hover:text-indigo-600 shadow-xs"
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-bold truncate ${
                    activeTab === "notifications"
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  Email Notifications
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    activeTab === "notifications"
                      ? "bg-white/20 text-white"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  }`}
                >
                  {recipients.length}
                </span>
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  activeTab === "notifications"
                    ? "text-slate-300"
                    : "text-slate-500"
                }`}
              >
                Instant Alerts & 8 AM Digest
              </p>
            </div>
          </button>

          {/* Tab 3: Account Drift Rules */}
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-200 group ${
              activeTab === "rules"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                activeTab === "rules"
                  ? "bg-white/10 text-white"
                  : "bg-white text-slate-700 group-hover:text-indigo-600 shadow-xs"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-bold truncate ${
                    activeTab === "rules" ? "text-white" : "text-slate-900"
                  }`}
                >
                  Account Drift Rules
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    activeTab === "rules"
                      ? "bg-white/20 text-white"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  }`}
                >
                  {discoveredTags.length}
                </span>
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  activeTab === "rules" ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Tag limits, warmup & ramp caps
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-200">
        {activeTab === "connections" && (
          <ConnectionsPageClient
            userId={userId}
            initialIntegrations={integrations}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationSettingsClient
            userId={userId}
            initialRecipients={recipients}
          />
        )}

        {activeTab === "rules" && (
          <AccountRulesSettingsClient
            discoveredTags={discoveredTags}
            initialRules={rules}
          />
        )}
      </div>
    </div>
  );
}