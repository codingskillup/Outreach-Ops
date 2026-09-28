"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  CheckCircle2,
  RefreshCw,
  TriangleAlert,
  CircleAlert,
  FlaskConical,
} from "lucide-react";

type SystemStatus =
  | "loading"
  | "demo"
  | "operational"
  | "warning"
  | "critical";

export default function PortalHeader() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    lastRefresh,
    setLastRefresh,
  ] =
    useState<string | null>(
      null
    );

  const [
    systemStatus,
    setSystemStatus,
  ] =
    useState<SystemStatus>(
      "loading"
    );

  const [
    openIssues,
    setOpenIssues,
  ] = useState(0);

  const titles: Record<
    string,
    string
  > = {
    "/dashboard":
      "Dashboard",

    "/clients":
      "Clients",

    "/emailaccounts":
      "Email Accounts",

    "/campaigns":
      "Campaigns",

    "/domains":
      "Domains",

    "/issues":
      "Issues",

    "/activity":
      "Activity",

    "/notes":
      "Notes",

    "/connections":
      "Connections",
  };

  let title =
    titles[pathname] ||
    "Outreach Ops";

  if (
    pathname.startsWith(
      "/clients/"
    )
  ) {
    title =
      "Client Details";
  }

  useEffect(() => {
    loadSystemStatus();
  }, []);

  async function loadSystemStatus() {
    try {
      const response =
        await fetch(
          "/api/system-status",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        return;
      }

      setSystemStatus(
        result.status
      );

      setOpenIssues(
        result.openIssues || 0
      );
    } catch {
      //
    }
  }

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    router.refresh();

    await loadSystemStatus();

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          600
        )
    );

    setLastRefresh(
      new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    );

    setRefreshing(false);
  }

  const statusUI =
    getStatusUI(
      systemStatus,
      openIssues
    );

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 250,
        right: 0,
        height: 100,
        background:
          "#FFFFFF",
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
              whiteSpace:
                "nowrap",
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
            background:
              statusUI.background,
            color:
              statusUI.color,
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            whiteSpace:
              "nowrap",
          }}
        >
          {statusUI.icon}

          {statusUI.label}
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
            background:
              "#FFFFFF",
            color:
              "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 9,
            paddingLeft: 15,
            paddingRight: 15,
            cursor:
              refreshing
                ? "not-allowed"
                : "pointer",
            fontSize: 13,
            fontWeight: 700,
            opacity:
              refreshing
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

function getStatusUI(
  status: SystemStatus,
  openIssues: number
) {
  if (
    status === "critical"
  ) {
    return {
      label: `${openIssues} critical attention`,

      background:
        "#FEF2F2",

      color:
        "#B91C1C",

      icon: (
        <CircleAlert
          size={17}
        />
      ),
    };
  }

  if (
    status === "warning"
  ) {
    return {
      label: `${openIssues} issues need attention`,

      background:
        "#FEF3C7",

      color:
        "#B45309",

      icon: (
        <TriangleAlert
          size={17}
        />
      ),
    };
  }

  if (
    status === "demo"
  ) {
    return {
      label:
        "Demo mode",

      background:
        "#EFF6FF",

      color:
        "#2563EB",

      icon: (
        <FlaskConical
          size={17}
        />
      ),
    };
  }

  if (
    status ===
    "operational"
  ) {
    return {
      label:
        "All systems operational",

      background:
        "#ECFDF5",

      color:
        "#047857",

      icon: (
        <CheckCircle2
          size={17}
        />
      ),
    };
  }

  return {
    label:
      "Checking status",

    background:
      "#F8FAFC",

    color:
      "#64748B",

    icon: (
      <RefreshCw
        size={17}
      />
    ),
  };
}