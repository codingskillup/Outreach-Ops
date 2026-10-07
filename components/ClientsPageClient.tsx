"use client";

import Link from "next/link";

import type {
  ReactNode,
} from "react";

import {
  useMemo,
  useState,
} from "react";

type ClientSummary = {
  id: string;
  name: string;
  totalAccounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  activeCampaigns: number;
  healthyAccounts: number;
  issues: number;
};

export default function ClientsPageClient({
  clients,
}: {
  clients:
    ClientSummary[];
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const filteredClients =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return clients;
      }

      return clients.filter(
        (client) =>
          client.name
            .toLowerCase()
            .includes(value)
      );
    }, [
      clients,
      search,
    ]);

  const totalClients =
    clients.length;

  const totalAccounts =
    clients.reduce(
      (
        total,
        client
      ) =>
        total +
        client.totalAccounts,
      0
    );

  const totalCampaigns =
    clients.reduce(
      (
        total,
        client
      ) =>
        total +
        client.activeCampaigns,
      0
    );

  const totalIssues =
    clients.reduce(
      (
        total,
        client
      ) =>
        total +
        client.issues,
      0
    );

  const clientsWithIssues =
    clients.filter(
      (client) =>
        client.issues >
        0
    ).length;

  return (
    <div
      style={{
        width:
          "100%",
        minWidth:
          0,
        color:
          "#111827",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          gap: 16,
          marginBottom:
            26,
        }}
      >
        <div>
          <h1
            style={{
              margin:
                0,
              fontSize:
                28,
              fontWeight:
                750,
            }}
          >
            Clients
          </h1>

          <p
            style={{
              marginTop:
                7,
              marginBottom:
                0,
              color:
                "#6B7280",
              fontSize:
                14,
            }}
          >
            Live account types,
            active campaigns and
            open issues grouped by
            client.
          </p>
        </div>

        <div
          style={{
            marginLeft:
              "auto",
            background:
              "#ECFDF5",
            color:
              "#047857",
            borderRadius:
              8,
            padding:
              "7px 10px",
            fontSize:
              11,
            fontWeight:
              700,
          }}
        >
          Live Data
        </div>
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom:
            22,
        }}
      >
        <SummaryCard
          title="Total Clients"
          value={
            totalClients
              .toLocaleString()
          }
        />

        <SummaryCard
          title="Total Accounts"
          value={
            totalAccounts
              .toLocaleString()
          }
        />

        <SummaryCard
          title="Active Campaigns"
          value={
            totalCampaigns
              .toLocaleString()
          }
        />

        <SummaryCard
          title="Clients With Issues"
          value={
            clientsWithIssues
              .toLocaleString()
          }
          warning={
            clientsWithIssues >
            0
          }
        />

        <SummaryCard
          title="Open Issues"
          value={
            totalIssues
              .toLocaleString()
          }
          warning={
            totalIssues >
            0
          }
        />
      </div>

      <div
        style={{
          background:
            "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius:
            14,
          padding:
            18,
          marginBottom:
            20,
        }}
      >
        <input
          value={
            search
          }
          onChange={(
            event
          ) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search client"
          style={{
            width:
              320,
            maxWidth:
              "100%",
            height:
              42,
            border:
              "1px solid #D1D5DB",
            borderRadius:
              9,
            padding:
              "0 12px",
            background:
              "#FFFFFF",
            color:
              "#111827",
            fontSize:
              13,
            outline:
              "none",
            boxSizing:
              "border-box",
          }}
        />
      </div>

      <div
        style={{
          background:
            "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius:
            14,
          overflow:
            "hidden",
        }}
      >
        <div
          style={{
            padding:
              16,
            borderBottom:
              "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              fontSize:
                16,
              fontWeight:
                700,
            }}
          >
            Client Overview
          </div>

          <div
            style={{
              color:
                "#6B7280",
              fontSize:
                11,
              marginTop:
                4,
            }}
          >
            {
              filteredClients.length
            }{" "}
            clients shown
          </div>
        </div>

        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width:
                "100%",
              minWidth:
                1050,
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
                  width="13%"
                />

                <TableHeader
                  text="Accounts"
                  width="8%"
                />

                <TableHeader
                  text="Azure / Entra"
                  width="12%"
                />

                <TableHeader
                  text="Hyper Google"
                  width="11%"
                />

                <TableHeader
                  text="Workspace"
                  width="10%"
                />

                <TableHeader
                  text="Campaigns"
                  width="9%"
                />

                <TableHeader
                  text="Healthy"
                  width="8%"
                />

                <TableHeader
                  text="Issues"
                  width="7%"
                />

                <TableHeader
                  text="Health"
                  width="8%"
                />

                <TableHeader
                  text="Details"
                  width="10%"
                />
              </tr>
            </thead>

            <tbody>
              {filteredClients.map(
                (
                  client
                ) => {
                  const health =
                    client.totalAccounts >
                    0
                      ? Math.round(
                          (
                            client.healthyAccounts /
                            client.totalAccounts
                          ) *
                            100
                        )
                      : 0;

                  return (
                    <tr
                      key={
                        client.id
                      }
                      style={{
                        borderTop:
                          "1px solid #F1F5F9",
                      }}
                    >
                      <TableCell>
                        <span
                          style={{
                            color:
                              "#111827",
                            fontWeight:
                              700,
                          }}
                        >
                          {
                            client.name
                          }
                        </span>
                      </TableCell>

                      <TableCell>
                        {client.totalAccounts.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        {client.azureEntra.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        {client.hypertideGoogle.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        {client.googleWorkspace.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <CampaignBadge
                          value={
                            client.activeCampaigns
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <span
                          style={{
                            color:
                              "#047857",
                            fontWeight:
                              700,
                          }}
                        >
                          {client.healthyAccounts.toLocaleString()}
                        </span>
                      </TableCell>

                      <TableCell>
                        <IssueBadge
                          value={
                            client.issues
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <HealthBadge
                          value={
                            health
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/clients/${client.id}`}
                          style={{
                            padding:
                              "6px 8px",
                            borderRadius:
                              7,
                            background:
                              "#EFF6FF",
                            color:
                              "#2563EB",
                            textDecoration:
                              "none",
                            fontSize:
                              10,
                            fontWeight:
                              700,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          View Details
                        </Link>
                      </TableCell>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {filteredClients.length ===
          0 && (
          <div
            style={{
              padding:
                30,
              textAlign:
                "center",
              color:
                "#64748B",
              fontSize:
                12,
            }}
          >
            No clients found.
          </div>
        )}
      </div>

      {clients.length ===
        1 &&
        clients[0]?.name ===
          "Unassigned" && (
          <div
            style={{
              marginTop:
                14,
              padding:
                "12px 14px",
              border:
                "1px solid #E5E7EB",
              borderRadius:
                10,
              background:
                "#F8FAFC",
              color:
                "#64748B",
              fontSize:
                12,
              lineHeight:
                1.6,
            }}
          >
            Smartlead synced
            the mailbox data, but
            no client name is
            currently available
            in the synced account
            payload. Accounts are
            therefore grouped
            under{" "}
            <strong>
              Unassigned
            </strong>
            .
          </div>
        )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  warning,
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background:
          "#FFFFFF",
        border:
          "1px solid #E5E7EB",
        borderRadius:
          13,
        padding:
          18,
      }}
    >
      <div
        style={{
          color:
            "#64748B",
          fontSize:
            12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            8,
          fontSize:
            25,
          fontWeight:
            750,
          color:
            warning
              ? "#B45309"
              : "#111827",
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
        padding:
          "11px 9px",
        textAlign:
          "left",
        fontSize:
          10,
        fontWeight:
          650,
        color:
          "#64748B",
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
    ReactNode;
}) {
  return (
    <td
      style={{
        padding:
          "12px 9px",
        fontSize:
          11,
        color:
          "#475569",
        verticalAlign:
          "middle",
        whiteSpace:
          "nowrap",
        overflow:
          "hidden",
        textOverflow:
          "ellipsis",
      }}
    >
      {children}
    </td>
  );
}

function CampaignBadge({
  value,
}: {
  value: number;
}) {
  return (
    <span
      style={{
        background:
          value > 0
            ? "#EFF6FF"
            : "#F8FAFC",
        color:
          value > 0
            ? "#2563EB"
            : "#64748B",
        padding:
          "5px 7px",
        borderRadius:
          7,
        fontSize:
          10,
        fontWeight:
          700,
      }}
    >
      {value}
    </span>
  );
}

function IssueBadge({
  value,
}: {
  value: number;
}) {
  return (
    <span
      style={{
        background:
          value > 0
            ? "#FEF3C7"
            : "#ECFDF5",
        color:
          value > 0
            ? "#B45309"
            : "#047857",
        padding:
          "5px 7px",
        borderRadius:
          7,
        fontSize:
          10,
        fontWeight:
          700,
      }}
    >
      {value}
    </span>
  );
}

function HealthBadge({
  value,
}: {
  value: number;
}) {
  const healthy =
    value >= 95;

  return (
    <span
      style={{
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
        borderRadius:
          7,
        fontSize:
          10,
        fontWeight:
          700,
      }}
    >
      {value}%
    </span>
  );
}
