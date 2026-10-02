"use client";

import { useState } from "react";
import { Plug, Bell, ShieldCheck } from "lucide-react";
import ConnectionsPageClient, { type Integration } from "@/components/ConnectionsPageClient";
import NotificationSettingsClient, { type Recipient } from "@/components/NotificationSettingsClient";

type Tab = "connections" | "notifications";

export default function SettingsPageClient({
  userId,
  integrations,
  recipients,
}: {
  userId: string;
  integrations: Integration[];
  recipients: Recipient[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("connections");

  const activeRecipientsCount = recipients.filter((r) => r.is_active).length;

  return (
    <div className="w-full max-w-[1360px] mx-auto pb-16 space-y-6">
      {/* Sleek Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Segmented Control Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => setActiveTab("connections")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "connections"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Plug
              className={`w-4 h-4 ${
                activeTab === "connections" ? "text-indigo-600" : "text-slate-500"
              }`}
            />
            <span>Platform Connections</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === "connections"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {integrations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "notifications"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Bell
              className={`w-4 h-4 ${
                activeTab === "notifications" ? "text-indigo-600" : "text-slate-500"
              }`}
            />
            <span>Email Notifications</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === "notifications"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {recipients.length}
            </span>
          </button>
        </div>

        {/* Status Indicators on the Right */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {integrations.length} {integrations.length === 1 ? "Connection" : "Connections"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {activeRecipientsCount} Active {activeRecipientsCount === 1 ? "Alert" : "Alerts"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>AES-256 Encrypted</span>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
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
      </div>
    </div>
  );
}
