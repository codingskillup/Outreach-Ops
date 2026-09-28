"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  domainDemoData,
} from "@/lib/domainDemoData";

import {
  CheckCircle2,
  TriangleAlert,
  Globe2,
  ShieldCheck,
} from "lucide-react";

type RealDomain = {
  id: string;

  domain: string;

  client:
    | string
    | null;

  spf_status:
    | string
    | null;

  dkim_status:
    | string
    | null;

  dmarc_status:
    | string
    | null;

  dmarc_policy:
    | string
    | null;

  reporting_status:
    | string
    | null;

  overall_status:
    | string
    | null;

  synced_at: string;
};

type DisplayDomain = {
  id: string;

  domain: string;

  client: string;

  spfStatus: string;

  dkimStatus: string;

  dmarcStatus: string;

  dmarcPolicy: string;

  reportingStatus: string;

  overallStatus: string;

  syncedAt:
    | string
    | null;

  live: boolean;
};

export default function DomainsPageClient({
  realDomains = [],
}: {
  realDomains?: RealDomain[];
}) {
  const [search, setSearch] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] =
    useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const [
    dmarcFilter,
    setDmarcFilter,
  ] =
    useState("all");

  const hasRealData =
    realDomains.length > 0;

  const domains:
    DisplayDomain[] =
    useMemo(() => {
      if (hasRealData) {
        return realDomains.map(
          (domain) => ({
            id:
              domain.id,

            domain:
              domain.domain,

            client:
              domain.client ||
              "Unassigned",

            spfStatus:
              domain.spf_status ||
              "Unknown",

            dkimStatus:
              domain.dkim_status ||
              "Unknown",

            dmarcStatus:
              domain.dmarc_status ||
              "Unknown",

            dmarcPolicy:
              domain.dmarc_policy ||
              "Unknown",

            reportingStatus:
              domain.reporting_status ||
              "Unknown",

            overallStatus:
              domain.overall_status ||
              "Unknown",

            syncedAt:
              domain.synced_at,

            live: true,
          })
        );
      }

      return domainDemoData.map(
        (domain) => ({
          id:
            domain.id,

          domain:
            domain.domain,

          client:
            domain.client,

          spfStatus:
            domain.spfStatus,

          dkimStatus:
            domain.dkimStatus,

          dmarcStatus:
            domain.dmarcStatus,

          dmarcPolicy:
            domain.dmarcPolicy,

          reportingStatus:
            domain.reportingStatus,

          overallStatus:
            domain.overallStatus,

          syncedAt:
            null,

          live: false,
        })
      );
    }, [
      hasRealData,
      realDomains,
    ]);

  const clients =
    useMemo(
      () =>
        Array.from(
          new Set(
            domains.map(
              (domain) =>
                domain.client
            )
          )
        ).sort(),
      [domains]
    );

  const filteredDomains =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return domains.filter(
        (domain) => {
          const matchesSearch =
            !value ||
            domain.domain
              .toLowerCase()
              .includes(value) ||
            domain.client
              .toLowerCase()
              .includes(value);

          const matchesClient =
            clientFilter ===
              "all" ||
            domain.client ===
              clientFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            domain.overallStatus ===
              statusFilter;

          const matchesDmarc =
            dmarcFilter ===
              "all" ||
            domain.dmarcStatus ===
              dmarcFilter;

          return (
            matchesSearch &&
            matchesClient &&
            matchesStatus &&
            matchesDmarc
          );
        }
      );
    }, [
      domains,
      search,
      clientFilter,
      statusFilter,
      dmarcFilter,
    ]);

  const healthy =
    domains.filter(
      (domain) =>
        domain.overallStatus ===
        "Healthy"
    ).length;

  const attention =
    domains.filter(
      (domain) =>
        domain.overallStatus !==
        "Healthy"
    ).length;

  const validSpf =
    domains.filter(
      (domain) =>
        domain.spfStatus ===
        "Valid"
    ).length;

  const validDkim =
    domains.filter(
      (domain) =>
        domain.dkimStatus ===
        "Valid"
    ).length;

  const validDmarc =
    domains.filter(
      (domain) =>
        domain.dmarcStatus ===
        "Valid"
    ).length;

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
            Domains
          </h1>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#64748B",
              fontSize: 14,
            }}
          >
            Monitor SPF, DKIM,
            DMARC and reporting
            health.
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",

            background:
              hasRealData
                ? "#ECFDF5"
                : "#EFF6FF",

            color:
              hasRealData
                ? "#047857"
                : "#2563EB",

            padding:
              "7px 10px",

            borderRadius: 8,

            fontSize: 11,

            fontWeight: 700,
          }}
        >
          {hasRealData
            ? "Live Data"
            : "Demo Mode"}
        </div>
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
          value={
            domains.length
          }
          icon={
            <Globe2
              size={17}
            />
          }
        />

        <SummaryCard
          title="Healthy"
          value={healthy}
          icon={
            <CheckCircle2
              size={17}
            />
          }
          success
        />

        <SummaryCard
          title="Need Attention"
          value={attention}
          icon={
            <TriangleAlert
              size={17}
            />
          }
          warning
        />

        <SummaryCard
          title="Valid SPF"
          value={validSpf}
          icon={
            <ShieldCheck
              size={17}
            />
          }
          success
        />

        <SummaryCard
          title="Valid DMARC"
          value={validDmarc}
          icon={
            <ShieldCheck
              size={17}
            />
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
              "2fr 1fr 1fr 1fr",

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
            placeholder="Search domain or client"
            style={inputStyle}
          />

          <select
            value={clientFilter}
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
            value={statusFilter}
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

            <option value="Healthy">
              Healthy
            </option>

            <option value="Attention">
              Need Attention
            </option>
          </select>

          <select
            value={dmarcFilter}
            onChange={(event) =>
              setDmarcFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All DMARC
            </option>

            <option value="Valid">
              Valid
            </option>

            <option value="Invalid">
              Invalid
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

            display: "flex",

            alignItems:
              "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,

                fontWeight: 700,
              }}
            >
              Domain Overview
            </div>

            <div
              style={{
                marginTop: 4,

                color:
                  "#64748B",

                fontSize: 12,
              }}
            >
              {
                filteredDomains.length
              }{" "}
              domains shown
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",

              color:
                "#64748B",

              fontSize: 11,
            }}
          >
            Valid DKIM{" "}
            <strong
              style={{
                color:
                  "#047857",
              }}
            >
              {validDkim}
            </strong>
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
                text="Domain"
                width="20%"
              />

              <TableHeader
                text="Client"
                width="12%"
              />

              <TableHeader
                text="SPF"
                width="9%"
              />

              <TableHeader
                text="DKIM"
                width="9%"
              />

              <TableHeader
                text="DMARC"
                width="9%"
              />

              <TableHeader
                text="Policy"
                width="12%"
              />

              <TableHeader
                text="Reporting"
                width="14%"
              />

              <TableHeader
                text="Health"
                width="10%"
              />

              <TableHeader
                text="Last Sync"
                width="12%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredDomains.map(
              (domain) => (
                <tr
                  key={
                    domain.id
                  }
                  style={{
                    borderTop:
                      "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    <strong
                      style={{
                        color:
                          "#111827",
                      }}
                    >
                      {
                        domain.domain
                      }
                    </strong>
                  </TableCell>

                  <TableCell>
                    {
                      domain.client
                    }
                  </TableCell>

                  <TableCell>
                    <HealthBadge
                      value={
                        domain.spfStatus
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <HealthBadge
                      value={
                        domain.dkimStatus
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <HealthBadge
                      value={
                        domain.dmarcStatus
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {
                      domain.dmarcPolicy
                    }
                  </TableCell>

                  <TableCell>
                    <ReportingBadge
                      value={
                        domain.reportingStatus
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <OverallBadge
                      value={
                        domain.overallStatus
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {domain.syncedAt
                      ? formatDateTime(
                          domain.syncedAt
                        )
                      : "Demo"}
                  </TableCell>
                </tr>
              )
            )}
          </tbody>
        </table>

        {filteredDomains.length ===
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
            No domains found.
          </div>
        )}
      </div>
    </div>
  );
}

function HealthBadge({
  value,
}: {
  value: string;
}) {
  const valid =
    value === "Valid";

  return (
    <span
      style={{
        display:
          "inline-block",

        background:
          valid
            ? "#ECFDF5"
            : "#FEF2F2",

        color:
          valid
            ? "#047857"
            : "#B91C1C",

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

function ReportingBadge({
  value,
}: {
  value: string;
}) {
  const monitored =
    value ===
    "Monitored";

  return (
    <span
      style={{
        display:
          "inline-block",

        background:
          monitored
            ? "#ECFDF5"
            : "#FEF3C7",

        color:
          monitored
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

function OverallBadge({
  value,
}: {
  value: string;
}) {
  const healthy =
    value ===
    "Healthy";

  return (
    <span
      style={{
        display:
          "inline-block",

        background:
          healthy
            ? "#ECFDF5"
            : "#FEF3C7",

        color:
          healthy
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

function SummaryCard({
  title,
  value,
  icon,
  success,
  warning,
}: {
  title: string;

  value: number;

  icon:
    React.ReactNode;

  success?: boolean;

  warning?: boolean;
}) {
  let color =
    "#111827";

  let background =
    "#F8FAFC";

  if (success) {
    color =
      "#047857";

    background =
      "#ECFDF5";
  }

  if (warning) {
    color =
      "#B45309";

    background =
      "#FEF3C7";
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
          display: "flex",

          alignItems:
            "center",
        }}
      >
        <div
          style={{
            width: 32,

            height: 32,

            borderRadius: 8,

            background,

            color,

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "center",
          }}
        >
          {icon}
        </div>

        <div
          style={{
            marginLeft: 9,

            color:
              "#64748B",

            fontSize: 11,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,

          fontSize: 25,

          fontWeight: 750,

          color,
        }}
      >
        {value.toLocaleString()}
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

        overflow:
          "hidden",

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