"use client";

import { useMemo, useState } from "react";

import {
  domainDemoData,
  type CheckStatus,
} from "@/lib/domainDemoData";

export default function DomainsPageClient() {
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("all");
  const [emailguard, setEmailguard] = useState("all");
  const [status, setStatus] = useState("all");

  const domains = domainDemoData;

  const clients = Array.from(
    new Set(domains.map((item) => item.client))
  );

  const emailguards = Array.from(
    new Set(domains.map((item) => item.emailguard))
  );

  function isHealthy(domain: (typeof domains)[number]) {
    return (
      domain.spf === "Pass" &&
      domain.dkim === "Pass" &&
      domain.dmarc === "Pass" &&
      domain.blacklist === "Pass"
    );
  }

  const healthyCount =
    domains.filter((domain) => isHealthy(domain)).length;

  const issueCount =
    domains.length - healthyCount;

  const dmarcIssues =
    domains.filter((domain) => domain.dmarc !== "Pass").length;

  const blacklistIssues =
    domains.filter((domain) => domain.blacklist !== "Pass").length;

  const filteredDomains = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return domains.filter((domain) => {
      const matchesSearch =
        !searchValue ||
        domain.domain
          .toLowerCase()
          .includes(searchValue) ||
        domain.client
          .toLowerCase()
          .includes(searchValue);

      const matchesClient =
        client === "all" ||
        domain.client === client;

      const matchesEmailguard =
        emailguard === "all" ||
        domain.emailguard === emailguard;

      const healthy =
        isHealthy(domain);

      const matchesStatus =
        status === "all" ||
        (status === "healthy" && healthy) ||
        (status === "attention" && !healthy);

      return (
        matchesSearch &&
        matchesClient &&
        matchesEmailguard &&
        matchesStatus
      );
    });
  }, [
    domains,
    search,
    client,
    emailguard,
    status,
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
          Domains
        </h1>

        <p
          style={{
            marginTop: 7,
            marginBottom: 0,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          Review SPF, DKIM, DMARC and blacklist health from EmailGuard.
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
          title="Total Domains"
          value={domains.length.toString()}
        />

        <SummaryCard
          title="Healthy"
          value={healthyCount.toString()}
          success
        />

        <SummaryCard
          title="Need Attention"
          value={issueCount.toString()}
          warning
        />

        <SummaryCard
          title="DMARC Issues"
          value={dmarcIssues.toString()}
          warning
        />

        <SummaryCard
          title="Blacklist Issues"
          value={blacklistIssues.toString()}
          danger
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
              "2fr 1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search domain or client"
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
            value={emailguard}
            onChange={(event) =>
              setEmailguard(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">
              All EmailGuard
            </option>

            {emailguards.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
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

            <option value="healthy">
              Healthy
            </option>

            <option value="attention">
              Need Attention
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
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Domain Health
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {filteredDomains.length} domains shown
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
                text="Domain"
                width="20%"
              />

              <TableHeader
                text="Client"
                width="12%"
              />

              <TableHeader
                text="EmailGuard"
                width="13%"
              />

              <TableHeader
                text="SPF"
                width="8%"
              />

              <TableHeader
                text="DKIM"
                width="8%"
              />

              <TableHeader
                text="DMARC"
                width="8%"
              />

              <TableHeader
                text="Blacklist"
                width="9%"
              />

              <TableHeader
                text="Status"
                width="10%"
              />

              <TableHeader
                text="Last Checked"
                width="12%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredDomains.map((domain) => {
              const healthy =
                isHealthy(domain);

              return (
                <tr
                  key={domain.id}
                  style={{
                    borderTop:
                      "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {domain.domain}
                    </span>
                  </TableCell>

                  <TableCell>
                    {domain.client}
                  </TableCell>

                  <TableCell>
                    {domain.emailguard}
                  </TableCell>

                  <TableCell>
                    <CheckBadge
                      value={domain.spf}
                    />
                  </TableCell>

                  <TableCell>
                    <CheckBadge
                      value={domain.dkim}
                    />
                  </TableCell>

                  <TableCell>
                    <CheckBadge
                      value={domain.dmarc}
                    />
                  </TableCell>

                  <TableCell>
                    <CheckBadge
                      value={domain.blacklist}
                    />
                  </TableCell>

                  <TableCell>
                    <HealthBadge
                      healthy={healthy}
                    />
                  </TableCell>

                  <TableCell>
                    {domain.lastChecked}
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDomains.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "#64748B",
              fontSize: 13,
            }}
          >
            No domains found.
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
  success,
  warning,
  danger,
}: {
  title: string;
  value: string;
  success?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  let color = "#111827";

  if (success) {
    color = "#047857";
  }

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
        padding: "11px 9px",
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
        padding: "12px 9px",
        fontSize: 11,
        color: "#475569",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </td>
  );
}

function CheckBadge({
  value,
}: {
  value: CheckStatus;
}) {
  let background = "#ECFDF5";
  let color = "#047857";

  if (value === "Warning") {
    background = "#FEF3C7";
    color = "#B45309";
  }

  if (value === "Fail") {
    background = "#FEF2F2";
    color = "#B91C1C";
  }

  return (
    <span
      style={{
        display: "inline-block",
        background,
        color,
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  );
}

function HealthBadge({
  healthy,
}: {
  healthy: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background:
          healthy
            ? "#ECFDF5"
            : "#FEF3C7",
        color:
          healthy
            ? "#047857"
            : "#B45309",
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {healthy
        ? "Healthy"
        : "Attention"}
    </span>
  );
}