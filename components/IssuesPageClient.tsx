"use client";

import { useMemo, useState } from "react";

import {
  issueDemoData,
  type IssueSeverity,
  type IssueSource,
  type IssueStatus,
} from "@/lib/issueDemoData";

type FilterValue = "all" | string;

export default function IssuesPageClient() {
  const [search, setSearch] = useState("");
  const [source, setSource] =
    useState<FilterValue>("all");
  const [severity, setSeverity] =
    useState<FilterValue>("all");
  const [status, setStatus] =
    useState<FilterValue>("Open");
  const [client, setClient] =
    useState<FilterValue>("all");

  const issues = issueDemoData;

  const clients = Array.from(
    new Set(
      issues.map((item) => item.client)
    )
  );

  const openIssues = issues.filter(
    (item) => item.status === "Open"
  );

  const criticalCount =
    openIssues.filter(
      (item) =>
        item.severity === "Critical"
    ).length;

  const warningCount =
    openIssues.filter(
      (item) =>
        item.severity === "Warning"
    ).length;

  const resolvedCount =
    issues.filter(
      (item) =>
        item.status === "Resolved"
    ).length;

  const smartleadCount =
    openIssues.filter(
      (item) =>
        item.source === "Smartlead"
    ).length;

  const emailguardCount =
    openIssues.filter(
      (item) =>
        item.source === "EmailGuard"
    ).length;

  const filteredIssues = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        !searchValue ||
        issue.item
          .toLowerCase()
          .includes(searchValue) ||
        issue.client
          .toLowerCase()
          .includes(searchValue) ||
        issue.issueType
          .toLowerCase()
          .includes(searchValue);

      const matchesSource =
        source === "all" ||
        issue.source === source;

      const matchesSeverity =
        severity === "all" ||
        issue.severity === severity;

      const matchesStatus =
        status === "all" ||
        issue.status === status;

      const matchesClient =
        client === "all" ||
        issue.client === client;

      return (
        matchesSearch &&
        matchesSource &&
        matchesSeverity &&
        matchesStatus &&
        matchesClient
      );
    });
  }, [
    issues,
    search,
    source,
    severity,
    status,
    client,
  ]);

  return (
    <div
      style={{
        width: "100%",
        color: "#111827",
      }}
    >
      <div
        style={{
          marginBottom: 26,
        }}
      >
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
          Review Smartlead and EmailGuard problems that need attention.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SummaryCard
          title="Open Issues"
          value={openIssues.length.toString()}
          warning
        />

        <SummaryCard
          title="Critical"
          value={criticalCount.toString()}
          danger
        />

        <SummaryCard
          title="Warnings"
          value={warningCount.toString()}
          warning
        />

        <SummaryCard
          title="Smartlead Issues"
          value={smartleadCount.toString()}
        />

        <SummaryCard
          title="EmailGuard Issues"
          value={emailguardCount.toString()}
        />
      </div>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
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
              setSearch(event.target.value)
            }
            placeholder="Search issue, email, domain or client"
            style={inputStyle}
          />

          <select
            value={client}
            onChange={(event) =>
              setClient(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">
              All Clients
            </option>

            {clients.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(event) =>
              setSource(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">
              All Sources
            </option>

            <option value="Smartlead">
              Smartlead
            </option>

            <option value="EmailGuard">
              EmailGuard
            </option>
          </select>

          <select
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value)
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

            <option value="Info">
              Info
            </option>
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
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
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom:
              "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div>
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
                color: "#6B7280",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {filteredIssues.length} issues shown
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              color: "#047857",
              background: "#ECFDF5",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {resolvedCount} resolved
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#F8FAFC",
              }}
            >
              <TableHeader
                text="Source"
                width="8%"
              />

              <TableHeader
                text="Client"
                width="10%"
              />

              <TableHeader
                text="Issue"
                width="12%"
              />

              <TableHeader
                text="Email or Domain"
                width="18%"
              />

              <TableHeader
                text="Account Type"
                width="15%"
              />

              <TableHeader
                text="Current"
                width="8%"
              />

              <TableHeader
                text="Expected"
                width="8%"
              />

              <TableHeader
                text="Severity"
                width="8%"
              />

              <TableHeader
                text="Status"
                width="7%"
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
                    <SourceBadge
                      source={
                        issue.source
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {issue.client}
                  </TableCell>

                  <TableCell>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {issue.issueType}
                    </span>
                  </TableCell>

                  <TableCell>
                    {issue.item}
                  </TableCell>

                  <TableCell>
                    {issue.accountType ||
                      "Not applicable"}
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
                      {issue.currentValue ||
                        "Not available"}
                    </span>
                  </TableCell>

                  <TableCell>
                    {issue.expectedValue ||
                      "Not available"}
                  </TableCell>

                  <TableCell>
                    <SeverityBadge
                      severity={
                        issue.severity
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      status={
                        issue.status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {issue.detectedAt}
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
              padding: 32,
              textAlign: "center",
              color: "#64748B",
              fontSize: 13,
            }}
          >
            No issues found.
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: 42,
  border: "1px solid #D1D5DB",
  borderRadius: 9,
  padding: "0 11px",
  background: "#FFFFFF",
  color: "#111827",
  fontSize: 13,
  outline: "none",
  boxSizing:
    "border-box" as const,
};

function SummaryCard({
  title,
  value,
  warning,
  danger,
}: {
  title: string;
  value: string;
  warning?: boolean;
  danger?: boolean;
}) {
  let color = "#111827";

  if (warning) {
    color = "#B45309";
  }

  if (danger) {
    color = "#B91C1C";
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 13,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#64748B",
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
        padding: "11px 8px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 650,
        color: "#64748B",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding: "12px 8px",
        color: "#475569",
        fontSize: 11,
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function SourceBadge({
  source,
}: {
  source: IssueSource;
}) {
  const smartlead =
    source === "Smartlead";

  return (
    <span
      style={{
        display: "block",
        width: "fit-content",
        background: smartlead
          ? "#EFF6FF"
          : "#F5F3FF",
        color: smartlead
          ? "#2563EB"
          : "#7C3AED",
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {source}
    </span>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: IssueSeverity;
}) {
  let background = "#F1F5F9";
  let color = "#475569";

  if (severity === "Critical") {
    background = "#FEF2F2";
    color = "#B91C1C";
  }

  if (severity === "Warning") {
    background = "#FEF3C7";
    color = "#B45309";
  }

  return (
    <span
      style={{
        display: "block",
        width: "fit-content",
        background,
        color,
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {severity}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: IssueStatus;
}) {
  const resolved =
    status === "Resolved";

  return (
    <span
      style={{
        display: "block",
        width: "fit-content",
        background: resolved
          ? "#ECFDF5"
          : "#FEF3C7",
        color: resolved
          ? "#047857"
          : "#B45309",
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}