"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/emailaccounts": "Email Accounts",
  "/campaigns": "Campaigns",
  "/domains": "Domains",
  "/issues": "Issues",
  "/activity": "Activity",
  "/notes": "Notes",
  "/connections": "Connections",
};

export default function PortalHeader() {
  const pathname = usePathname();

  const title = titles[pathname] || "Outreach Ops";

  return (
    <header
      style={{
        height: 84,
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <div
          style={{
            color: "#64748B",
            fontSize: 13,
            marginBottom: 5,
          }}
        >
          Outreach Ops
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#ECFDF5",
            color: "#047857",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={17} />

          All systems operational
        </div>

        <button
          type="button"
          style={{
            height: 42,
            border: "1px solid #D1D5DB",
            borderRadius: 10,
            background: "#FFFFFF",
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          <RefreshCw size={16} />

          Refresh
        </button>
      </div>
    </header>
  );
}