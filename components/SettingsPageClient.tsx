"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plug,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  Server,
  Lock,
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
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") as Tab | null;

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === "rules" || tabParam === "notifications"
      ? tabParam
      : "connections"
  );

  const safeIntegrations = (integrations || []).filter(
    (item): item is Integration => Boolean(item && typeof item === "object" && item.provider)
  );

  const safeRecipients = (recipients || []).filter(
    (item): item is Recipient => Boolean(item && typeof item === "object" && item.email)
  );

  const safeRules = (rules || []).filter(
    (item): item is AccountTypeRule => Boolean(item && typeof item === "object" && item.id)
  );

  const activeRecipientsCount = safeRecipients.filter(
    (recipient) => recipient.is_active
  ).length;

  const activeRulesCount = safeRules.filter((rule) => rule.is_enabled).length;

  return (
    <div className="w-full max-w-[1440px] mx-auto pb-16 space-y-6 text-slate-900">
      {/* Sleek Minimalist Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Settings
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AES-256 Encrypted
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage connected platforms, alert subscribers, and mailbox sending limits.
          </p>
        </div>

        {/* Global Connection Badges */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>{safeIntegrations.length} {safeIntegrations.length === 1 ? "Pipeline" : "Pipelines"} Connected</span>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-px">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Tab 1: Platform Connections */}
          <button
            type="button"
            onClick={() => setActiveTab("connections")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "connections"
                ? "bg-slate-900 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Plug className="w-4 h-4" />
            <span>Integrations</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "connections"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {safeIntegrations.length}
            </span>
          </button>

          {/* Tab 2: Email Notifications */}
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "notifications"
                ? "bg-slate-900 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "notifications"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {safeRecipients.length}
            </span>
          </button>

          {/* Tab 3: Account Drift Rules */}
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "rules"
                ? "bg-slate-900 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Mailbox Rules</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "rules"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {activeRulesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "connections" && (
          <ConnectionsPageClient
            userId={userId}
            initialIntegrations={safeIntegrations}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationSettingsClient
            userId={userId}
            initialRecipients={safeRecipients}
          />
        )}

        {activeTab === "rules" && (
          <AccountRulesSettingsClient
            discoveredTags={discoveredTags}
            initialRules={safeRules}
          />
        )}
      </div>
    </div>
  );
}