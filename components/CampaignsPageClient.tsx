"use client";

import { useMemo, useState } from "react";

import {
  campaignDemoData,
  type CampaignStatus,
} from "@/lib/campaignDemoData";

type StatusFilter =
  | "all"
  | CampaignStatus;

export default function CampaignsPageClient() {
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("all");
  const [smartlead, setSmartlead] = useState("all");
  const [status, setStatus] =
    useState<StatusFilter>("all");

  const campaigns = campaignDemoData;

  const clients = Array.from(
    new Set(
      campaigns.map(
        (campaign) => campaign.client
      )
    )
  );

  const smartleads = Array.from(
    new Set(
      campaigns.map(
        (campaign) => campaign.smartlead
      )
    )
  );

  const activeCount = campaigns.filter(
    (campaign) =>
      campaign.status === "ACTIVE"
  ).length;

  const pausedCount = campaigns.filter(
    (campaign) =>
      campaign.status === "PAUSED"
  ).length;

  const stoppedCount = campaigns.filter(
    (campaign) =>
      campaign.status === "STOPPED"
  ).length;

  const draftCount = campaigns.filter(
    (campaign) =>
      campaign.status === "DRAFT"
  ).length;

  const filteredCampaigns = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return campaigns.filter(
      (campaign) => {
        const matchesSearch =
          !searchValue ||
          campaign.name
            .toLowerCase()
            .includes(searchValue) ||
          campaign.client
            .toLowerCase()
            .includes(searchValue);

        const matchesClient =
          client === "all" ||
          campaign.client === client;

        const matchesSmartlead =
          smartlead === "all" ||
          campaign.smartlead === smartlead;

        const matchesStatus =
          status === "all" ||
          campaign.status === status;

        return (
          matchesSearch &&
          matchesClient &&
          matchesSmartlead &&
          matchesStatus
        );
      }
    );
  }, [
    campaigns,
    search,
    client,
    smartlead,
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
          Campaigns
        </h1>

        <p
          style={{
            marginTop: 7,
            marginBottom: 0,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          Monitor campaign status,
          client activity and sending accounts.
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
          title="Total Campaigns"
          value={campaigns.length.toString()}
        />

        <SummaryCard
          title="Active"
          value={activeCount.toString()}
          success
        />

        <SummaryCard
          title="Paused"
          value={pausedCount.toString()}
          warning
        />

        <SummaryCard
          title="Stopped"
          value={stoppedCount.toString()}
          danger
        />

        <SummaryCard
          title="Draft"
          value={draftCount.toString()}
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
            placeholder="Search campaign or client"
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
            value={smartlead}
            onChange={(event) =>
              setSmartlead(event.target.value)
            }
            style={inputStyle}
          >
            <option value="all">
              All Smartlead
            </option>

            {smartleads.map((item) => (
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
              setStatus(
                event.target.value as
                  StatusFilter
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Status
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="PAUSED">
              Paused
            </option>

            <option value="STOPPED">
              Stopped
            </option>

            <option value="DRAFT">
              Draft
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
            Campaign Overview
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {filteredCampaigns.length} campaigns shown
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
                text="Campaign"
                width="18%"
              />

              <TableHeader
                text="Client"
                width="10%"
              />

              <TableHeader
                text="Smartlead"
                width="10%"
              />

              <TableHeader
                text="Status"
                width="8%"
              />

              <TableHeader
                text="Accounts"
                width="7%"
              />

              <TableHeader
                text="Active Since"
                width="11%"
              />

              <TableHeader
                text="Sent Today"
                width="9%"
              />

              <TableHeader
                text="Replies"
                width="7%"
              />

              <TableHeader
                text="Bounces"
                width="7%"
              />

              <TableHeader
                text="Issues"
                width="6%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredCampaigns.map(
              (campaign) => (
                <tr
                  key={campaign.id}
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
                      {campaign.name}
                    </span>
                  </TableCell>

                  <TableCell>
                    {campaign.client}
                  </TableCell>

                  <TableCell>
                    {campaign.smartlead}
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      status={
                        campaign.status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {campaign.accounts}
                  </TableCell>

                  <TableCell>
                    {campaign.activeSince ||
                      "Not active"}
                  </TableCell>

                  <TableCell>
                    {campaign.sentToday.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {campaign.replies.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {campaign.bounces.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <IssueBadge
                      value={
                        campaign.issues
                      }
                    />
                  </TableCell>
                </tr>
              )
            )}
          </tbody>
        </table>

        {filteredCampaigns.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "#64748B",
              fontSize: 13,
            }}
          >
            No campaigns found.
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
        color: "#64748B",
        fontSize: 10,
        fontWeight: 650,
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

function StatusBadge({
  status,
}: {
  status: CampaignStatus;
}) {
  let background = "#F1F5F9";
  let color = "#475569";

  if (status === "ACTIVE") {
    background = "#ECFDF5";
    color = "#047857";
  }

  if (status === "PAUSED") {
    background = "#FEF3C7";
    color = "#B45309";
  }

  if (status === "STOPPED") {
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
      {status}
    </span>
  );
}

function IssueBadge({
  value,
}: {
  value: number;
}) {
  const hasIssues = value > 0;

  return (
    <span
      style={{
        display: "inline-block",
        background:
          hasIssues
            ? "#FEF3C7"
            : "#ECFDF5",
        color:
          hasIssues
            ? "#B45309"
            : "#047857",
        padding: "5px 7px",
        borderRadius: 7,
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  );
}