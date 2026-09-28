"use client";

import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function PortalHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastRefresh, setLastRefresh] =
    useState<string | null>(null);

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/clients": "Clients",
    "/emailaccounts": "Email Accounts",
    "/campaigns": "Campaigns",
    "/domains": "Domains",
    "/issues": "Issues",
    "/activity": "Activity",
    "/notes": "Notes",
    "/connections": "Connections",
  };

  let title =
    titles[pathname] || "Outreach Ops";

  if (
    pathname.startsWith(
      "/clients/"
    )
  ) {
    title = "Client Details";
  }

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    router.refresh();

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 700)
    );

    const now =
      new Date();

    setLastRefresh(
      now.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    );

    setRefreshing(false);
  }

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 250,
        right: 0,
        height: 100,
        background: "#FFFFFF",
        borderBottom:
          "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        paddingLeft: 36,
        paddingRight: 36,
        zIndex: 40,
      }}
    >
      <div>
        <div
          style={{
            color: "#64748B",
            fontSize: 13,
            marginBottom: 7,
          }}
        >
          Outreach Ops
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 25,
            fontWeight: 750,
            color: "#0F172A",
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {lastRefresh && (
          <div
            style={{
              color: "#94A3B8",
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            Last refresh{" "}
            {lastRefresh}
          </div>
        )}

        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            gap: 9,
            paddingLeft: 15,
            paddingRight: 15,
            background: "#ECFDF5",
            color: "#047857",
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle2
            size={17}
          />

          All systems operational
        </div>

        <button
          type="button"
          onClick={
            handleRefresh
          }
          disabled={
            refreshing
          }
          style={{
            height: 48,
            minWidth: 124,
            border:
              "1px solid #D1D5DB",
            borderRadius: 11,
            background: "#FFFFFF",
            color: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 9,
            paddingLeft: 15,
            paddingRight: 15,
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
            fontSize: 13,
            fontWeight: 700,
            opacity: refreshing
              ? 0.7
              : 1,
          }}
        >
          <RefreshCw
            size={17}
            style={{
              animation:
                refreshing
                  ? "spin 0.8s linear infinite"
                  : "none",
            }}
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </header>
  );
}