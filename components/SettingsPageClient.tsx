"use client";

import { useState } from "react";

import { Plug, Mail } from "lucide-react";

import ConnectionsPageClient from "@/components/ConnectionsPageClient";

import NotificationSettingsClient from "@/components/NotificationSettingsClient";

type Integration = {
  id: string;
  provider: string;
  name: string;
  status: string | null;
  api_key_last4: string | null;
  last_synced_at: string | null;
  created_at: string | null;
};

type Recipient = {
  id: string;
  email: string;
  instant_issue_alert: boolean;
  daily_report: boolean;
  is_active: boolean;
  created_at: string | null;
};

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

  return (
    <div
      style={{
        maxWidth: "1400px",

        margin: "0 auto",

        padding: "8px 0 40px",
      }}
    >
      <div
        style={{
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            margin: 0,

            fontSize: 28,

            fontWeight: 750,

            color: "#111827",
          }}
        >
          Settings
        </h1>

        <p
          style={{
            margin: "7px 0 0",

            color: "#6b7280",

            fontSize: 14,
          }}
        >
          Manage integrations and email notifications.
        </p>
      </div>

      <div
        style={{
          display: "inline-flex",

          padding: 5,

          gap: 5,

          border: "1px solid #e5e7eb",

          borderRadius: 12,

          background: "#f9fafb",

          marginBottom: 28,
        }}
      >
        <TabButton
          active={activeTab === "connections"}
          onClick={() => setActiveTab("connections")}
          icon={<Plug size={16} />}
        >
          Connections
        </TabButton>

        <TabButton
          active={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          icon={<Mail size={16} />}
        >
          Email Notifications
        </TabButton>
      </div>

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
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",

        alignItems: "center",

        gap: 8,

        padding: "10px 16px",

        border: "none",

        borderRadius: 8,

        cursor: "pointer",

        fontWeight: 600,

        fontSize: 14,

        background: active ? "#ffffff" : "transparent",

        color: active ? "#111827" : "#6b7280",

        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {icon}

      {children}
    </button>
  );
}
