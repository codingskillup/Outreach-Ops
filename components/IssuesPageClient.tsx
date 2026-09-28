"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  issueDemoData,
} from "@/lib/issueDemoData";

import {
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

type RealIssue = {
  id: string;
  source: string;
  client: string | null;
  issue_type: string;
  item: string;
  account_type: string | null;
  current_value: string | null;
  expected_value: string | null;
  severity: string;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

type DisplayIssue = {
  id: string;
  source: string;
  client: string;
  issueType: string;
  item: string;
  accountType: string;
  currentValue: string;
  expectedValue: string;
  severity: string;
  status: string;
  detectedAt: string;
};

export default function IssuesPageClient({
  realIssues,
  hasLiveData,
}: {
  realIssues: RealIssue[];
  hasLiveData: boolean;
}) {
  const router =
    useRouter();

  const [search, setSearch] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] = useState("all");

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState("all");

  const [
    severityFilter,
    setSeverityFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("Open");

  const [scanning, setScanning] =
    useState(false);

  const issues:
    DisplayIssue[] =
    useMemo(() => {
      if (hasLiveData) {
        return realIssues.map(
          convertRealIssue
        );
      }

      return issueDemoData.map(
        (issue) => ({
          id:
            issue.id,

          source:
            issue.source,

          client:
            issue.client,

          issueType:
            issue.issueType,

          item:
            issue.item,

          accountType:
            issue.accountType ||
            "Not applicable",

          currentValue:
            issue.currentValue ||
            "Not available",

          expectedValue:
            issue.expectedValue ||
            "Not available",

          severity:
            issue.severity,

          status:
            issue.status,

          detectedAt:
            issue.detectedAt,
        })
      );
    }, [
      hasLiveData,
      realIssues,
    ]);

  const clients =
    useMemo(
      () =>
        Array.from(
          new Set(
            issues.map(
              (issue) =>
                issue.client
            )
          )
        ).sort(),
      [issues]
    );

  const sources =
    useMemo(
      () =>
        Array.from(
          new Set(
            issues.map(
              (issue) =>
                issue.source
            )
          )
        ).sort(),
      [issues]
    );

  const filteredIssues =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return issues.filter(
        (issue) => {
          const matchesSearch =
            !value ||
            issue.item
              .toLowerCase()
              .includes(value) ||
            issue.issueType
              .toLowerCase()
              .includes(value) ||
            issue.client
              .toLowerCase()
              .includes(value);

          const matchesClient =
            clientFilter ===
              "all" ||
            issue.client ===
              clientFilter;

          const matchesSource =
            sourceFilter ===
              "all" ||
            issue.source ===
              sourceFilter;

          const matchesSeverity =
            severityFilter ===
              "all" ||
            issue.severity ===
              severityFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            issue.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesClient &&
            matchesSource &&
            matchesSeverity &&
            matchesStatus
          );
        }
      );
    }, [
      issues,
      search,
      clientFilter,
      sourceFilter,
      severityFilter,
      statusFilter,
    ]);

  const openCount =
    issues.filter(
      (issue) =>
        issue.status === "Open"
    ).length;

  const criticalCount =
    issues.filter(
      (issue) =>
        issue.status ===
          "Open" &&
        issue.severity ===
          "Critical"
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.status ===
          "Open" &&
        issue.severity ===
          "Warning"
    ).length;

  const resolvedCount =
    issues.filter(
      (issue) =>
        issue.status ===
        "Resolved"
    ).length;

  async function handleScan() {
    if (!hasLiveData) {
      alert(
        "Smartlead live data is not available yet."
      );
      return;
    }

    setScanning(true);

    try {
      const response =
        await fetch(
          "/api/issues/scan",
          {
            method:
              "POST",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Issue scan failed."
        );

        return;
      }

      alert(
        `Scan completed

Accounts checked: ${result.summary.accountsChecked}
Open issues: ${result.summary.openIssues}
Warnings: ${result.summary.warnings}
Resolved: ${result.summary.resolved}`
      );

      router.refresh();
    } catch {
      alert(
        "Unable to scan issues."
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 750,
            }}
          >
            Issues
          </h1>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 14,
            }}
          >
            Review account settings
            that need attention.
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems:
              "center",
            gap: 10,
          }}
        >
          <div
            style={{
              background:
                hasLiveData
                  ? "#ECFDF5"
                  : "#EFF6FF",
              color:
                hasLiveData
                  ? "#047857"
                  : "#2563EB",
              borderRadius: 8,
              padding:
                "7px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {hasLiveData
              ? "Live Data"
              : "Demo Mode"}
          </div>

          <button
            type="button"
            onClick={
              handleScan
            }
            disabled={
              scanning
            }
            style={{
              height: 40,
              border: 0,
              borderRadius: 9,
              background:
                "#111827",
              color:
                "#FFFFFF",
              display: "flex",
              alignItems:
                "center",
              gap: 7,
              padding:
                "0 13px",
              cursor:
                scanning
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
              fontSize: 12,
              opacity:
                scanning
                  ? 0.7
                  : 1,
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation:
                  scanning
                    ? "spin 0.8s linear infinite"
                    : "none",
              }}
            />

            {scanning
              ? "Scanning"
              : "Scan Now"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SummaryCard
          title="Open Issues"
          value={openCount}
          warning
        />

        <SummaryCard
          title="Critical"
          value={
            criticalCount
          }
          danger
        />

        <SummaryCard
          title="Warnings"
          value={
            warningCount
          }
          warning
        />

        <SummaryCard
          title="Resolved"
          value={
            resolvedCount
          }
          success
        />
      </div>

      <div
        style={{
          background:
            "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius: 14,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search email, issue or client"
            style={inputStyle}
          />

          <select
            value={
              clientFilter
            }
            onChange={(event) =>
              setClientFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Clients
            </option>

            {clients.map(
              (client) => (
                <option
                  key={client}
                  value={client}
                >
                  {client}
                </option>
              )
            )}
          </select>

          <select
            value={
              sourceFilter
            }
            onChange={(event) =>
              setSourceFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Sources
            </option>

            {sources.map(
              (source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
                </option>
              )
            )}
          </select>

          <select
            value={
              severityFilter
            }
            onChange={(event) =>
              setSeverityFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Severity
            </option>

            <option value="Critical">
              Critical
            </option>

            <option value="Warning">
              Warning
            </option>
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Status
            </option>

            <option value="Open">
              Open
            </option>

            <option value="Resolved">
              Resolved
            </option>
          </select>
        </div>
      </div>

      <div
        style={{
          background:
            "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom:
              "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Issue Overview
          </div>

          <div
            style={{
              color:
                "#64748B",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {
              filteredIssues.length
            }{" "}
            issues shown
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
            tableLayout:
              "fixed",
          }}
        >
          <thead>
            <tr
              style={{
                background:
                  "#F8FAFC",
              }}
            >
              <TableHeader
                text="Client"
                width="10%"
              />

              <TableHeader
                text="Email"
                width="18%"
              />

              <TableHeader
                text="Issue"
                width="12%"
              />

              <TableHeader
                text="Account Type"
                width="15%"
              />

              <TableHeader
                text="Current"
                width="10%"
              />

              <TableHeader
                text="Expected"
                width="10%"
              />

              <TableHeader
                text="Severity"
                width="9%"
              />

              <TableHeader
                text="Status"
                width="8%"
              />

              <TableHeader
                text="Detected"
                width="12%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredIssues.map(
              (issue) => (
                <tr
                  key={issue.id}
                  style={{
                    borderTop:
                      "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    {issue.client}
                  </TableCell>

                  <TableCell>
                    <strong
                      style={{
                        color:
                          "#111827",
                      }}
                    >
                      {issue.item}
                    </strong>
                  </TableCell>

                  <TableCell>
                    {
                      issue.issueType
                    }
                  </TableCell>

                  <TableCell>
                    {
                      issue.accountType
                    }
                  </TableCell>

                  <TableCell>
                    <span
                      style={{
                        color:
                          issue.status ===
                          "Open"
                            ? "#B45309"
                            : "#64748B",
                        fontWeight: 700,
                      }}
                    >
                      {
                        issue.currentValue
                      }
                    </span>
                  </TableCell>

                  <TableCell>
                    {
                      issue.expectedValue
                    }
                  </TableCell>

                  <TableCell>
                    <SeverityBadge
                      value={
                        issue.severity
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      value={
                        issue.status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {
                      issue.detectedAt
                    }
                  </TableCell>
                </tr>
              )
            )}
          </tbody>
        </table>

        {filteredIssues.length ===
          0 && (
          <div
            style={{
              padding: 40,
              textAlign:
                "center",
              color:
                "#64748B",
              fontSize: 13,
            }}
          >
            <CheckCircle2
              size={27}
              color="#10B981"
            />

            <div
              style={{
                marginTop: 10,
                fontWeight: 700,
                color:
                  "#047857",
              }}
            >
              No issues found
            </div>
          </div>
        )}
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
    </div>
  );
}

function convertRealIssue(
  issue: RealIssue
): DisplayIssue {
  return {
    id:
      issue.id,

    source:
      issue.source,

    client:
      issue.client ||
      "Unassigned",

    issueType:
      issue.issue_type,

    item:
      issue.item,

    accountType:
      issue.account_type ||
      "Unclassified",

    currentValue:
      issue.current_value ||
      "Not available",

    expectedValue:
      issue.expected_value ||
      "Not available",

    severity:
      issue.severity,

    status:
      issue.status,

    detectedAt:
      formatDateTime(
        issue.first_seen_at
      ),
  };
}

function SummaryCard({
  title,
  value,
  success,
  warning,
  danger,
}: {
  title: string;
  value: number;
  success?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  let color =
    "#111827";

  if (success) {
    color =
      "#047857";
  }

  if (warning) {
    color =
      "#B45309";
  }

  if (danger) {
    color =
      "#B91C1C";
  }

  return (
    <div
      style={{
        background:
          "#FFFFFF",
        border:
          "1px solid #E5E7EB",
        borderRadius: 13,
        padding: 18,
      }}
    >
      <div
        style={{
          color:
            "#64748B",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 25,
          fontWeight: 750,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SeverityBadge({
  value,
}: {
  value: string;
}) {
  const critical =
    value === "Critical";

  return (
    <span
      style={{
        display:
          "inline-block",
        background:
          critical
            ? "#FEF2F2"
            : "#FEF3C7",
        color:
          critical
            ? "#B91C1C"
            : "#B45309",
        padding:
          "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  );
}

function StatusBadge({
  value,
}: {
  value: string;
}) {
  const resolved =
    value === "Resolved";

  return (
    <span
      style={{
        display:
          "inline-block",
        background:
          resolved
            ? "#ECFDF5"
            : "#FEF3C7",
        color:
          resolved
            ? "#047857"
            : "#B45309",
        padding:
          "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  );
}

function TableHeader({
  text,
  width,
}: {
  text: string;
  width?: string;
}) {
  return (
    <th
      style={{
        width,
        padding:
          "11px 9px",
        textAlign: "left",
        color:
          "#64748B",
        fontSize: 10,
        fontWeight: 650,
        whiteSpace:
          "nowrap",
      }}
    >
      {text}
    </th>
  );
}

function TableCell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td
      style={{
        padding:
          "12px 9px",
        color:
          "#475569",
        fontSize: 11,
        verticalAlign:
          "middle",
        overflow: "hidden",
        textOverflow:
          "ellipsis",
        whiteSpace:
          "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

const inputStyle = {
  width: "100%",
  minWidth: 0,
  height: 42,
  border:
    "1px solid #D1D5DB",
  borderRadius: 9,
  padding:
    "0 11px",
  background:
    "#FFFFFF",
  color:
    "#111827",
  fontSize: 13,
  outline: "none",
  boxSizing:
    "border-box" as const,
};