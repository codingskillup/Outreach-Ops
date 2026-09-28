"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  campaignDemoData,
} from "@/lib/campaignDemoData";

type RawData =
  Record<string, unknown>;

type IntegrationRelation =
  | {
      id: string;
      name: string;
      provider: string;
    }
  | {
      id: string;
      name: string;
      provider: string;
    }[]
  | null;

type RealCampaign = {
  id: string;
  external_id: number;
  name: string | null;
  status: string | null;
  first_seen_active_at:
    | string
    | null;
  raw_data:
    | RawData
    | null;
  synced_at: string;
  integration_id: string;
  integrations:
    IntegrationRelation;
};

type DisplayCampaign = {
  id: string;
  name: string;
  client: string;
  smartlead: string;
  status: string;
  accounts: number | null;
  activeSince:
    | string
    | null;
  lastSynced:
    | string
    | null;
  live: boolean;
};

export default function CampaignsPageClient({
  realCampaigns,
}: {
  realCampaigns: RealCampaign[];
}) {
  const [search, setSearch] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] = useState("all");

  const [
    smartleadFilter,
    setSmartleadFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const hasRealData =
    realCampaigns.length > 0;

  const campaigns:
    DisplayCampaign[] =
    useMemo(() => {
      if (hasRealData) {
        return realCampaigns.map(
          convertRealCampaign
        );
      }

      return campaignDemoData.map(
        (campaign) => ({
          id:
            campaign.id,

          name:
            campaign.name,

          client:
            campaign.client,

          smartlead:
            campaign.smartlead,

          status:
            campaign.status,

          accounts:
            campaign.accounts,

          activeSince:
            campaign.activeSince,

          lastSynced:
            null,

          live: false,
        })
      );
    }, [
      hasRealData,
      realCampaigns,
    ]);

  const clients =
    useMemo(
      () =>
        Array.from(
          new Set(
            campaigns.map(
              (item) =>
                item.client
            )
          )
        ).sort(),
      [campaigns]
    );

  const smartleads =
    useMemo(
      () =>
        Array.from(
          new Set(
            campaigns.map(
              (item) =>
                item.smartlead
            )
          )
        ).sort(),
      [campaigns]
    );

  const statuses =
    useMemo(
      () =>
        Array.from(
          new Set(
            campaigns.map(
              (item) =>
                item.status
            )
          )
        ).sort(),
      [campaigns]
    );

  const filteredCampaigns =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return campaigns.filter(
        (campaign) => {
          const matchesSearch =
            !value ||
            campaign.name
              .toLowerCase()
              .includes(value) ||
            campaign.client
              .toLowerCase()
              .includes(value);

          const matchesClient =
            clientFilter ===
              "all" ||
            campaign.client ===
              clientFilter;

          const matchesSmartlead =
            smartleadFilter ===
              "all" ||
            campaign.smartlead ===
              smartleadFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            campaign.status ===
              statusFilter;

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
      clientFilter,
      smartleadFilter,
      statusFilter,
    ]);

  const activeCount =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "ACTIVE"
    ).length;

  const pausedCount =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "PAUSED"
    ).length;

  const stoppedCount =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        "STOPPED"
    ).length;

  const otherCount =
    campaigns.length -
    activeCount -
    pausedCount -
    stoppedCount;

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
            Monitor Smartlead
            campaigns, clients and
            campaign status.
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
            borderRadius: 8,
            padding:
              "7px 10px",
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
          title="Total Campaigns"
          value={
            campaigns.length
          }
        />

        <SummaryCard
          title="Active"
          value={
            activeCount
          }
          success
        />

        <SummaryCard
          title="Paused"
          value={
            pausedCount
          }
          warning
        />

        <SummaryCard
          title="Stopped"
          value={
            stoppedCount
          }
          danger
        />

        <SummaryCard
          title="Other"
          value={
            otherCount
          }
        />
      </div>

      <div
        style={{
          background: "#FFFFFF",
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
            placeholder="Search campaign or client"
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
              smartleadFilter
            }
            onChange={(event) =>
              setSmartleadFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Smartlead
            </option>

            {smartleads.map(
              (smartlead) => (
                <option
                  key={
                    smartlead
                  }
                  value={
                    smartlead
                  }
                >
                  {smartlead}
                </option>
              )
            )}
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

            {statuses.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        style={{
          background: "#FFFFFF",
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
            Campaign Overview
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {
              filteredCampaigns.length
            }{" "}
            campaigns shown
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
                text="Campaign"
                width="24%"
              />

              <TableHeader
                text="Client"
                width="14%"
              />

              <TableHeader
                text="Smartlead"
                width="15%"
              />

              <TableHeader
                text="Status"
                width="10%"
              />

              <TableHeader
                text="Accounts"
                width="10%"
              />

              <TableHeader
                text="Active Since"
                width="14%"
              />

              <TableHeader
                text="Last Synced"
                width="13%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredCampaigns.map(
              (campaign) => (
                <tr
                  key={
                    campaign.id
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
                        campaign.name
                      }
                    </span>
                  </TableCell>

                  <TableCell>
                    {
                      campaign.client
                    }
                  </TableCell>

                  <TableCell>
                    {
                      campaign.smartlead
                    }
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      value={
                        campaign.status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {campaign.accounts !==
                    null
                      ? campaign.accounts
                      : "—"}
                  </TableCell>

                  <TableCell>
                    {campaign.activeSince
                      ? formatDate(
                          campaign.activeSince
                        )
                      : "—"}
                  </TableCell>

                  <TableCell>
                    {campaign.lastSynced
                      ? formatDateTime(
                          campaign.lastSynced
                        )
                      : campaign.live
                        ? "—"
                        : "Demo"}
                  </TableCell>
                </tr>
              )
            )}
          </tbody>
        </table>

        {filteredCampaigns.length ===
          0 && (
          <div
            style={{
              padding: 34,
              textAlign:
                "center",
              color:
                "#64748B",
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

function convertRealCampaign(
  campaign: RealCampaign
): DisplayCampaign {
  const raw =
    campaign.raw_data || {};

  const integration =
    Array.isArray(
      campaign.integrations
    )
      ? campaign
          .integrations[0]
      : campaign.integrations;

  return {
    id:
      campaign.id,

    name:
      campaign.name ||
      `Campaign ${campaign.external_id}`,

    client:
      getText(
        raw.client_name
      ) ||
      getText(
        raw.client
      ) ||
      "Unassigned",

    smartlead:
      integration?.name ||
      "Smartlead",

    status:
      normalizeStatus(
        campaign.status
      ),

    accounts:
      getCampaignAccountCount(
        raw
      ),

    activeSince:
      campaign.first_seen_active_at,

    lastSynced:
      campaign.synced_at,

    live: true,
  };
}

function getCampaignAccountCount(
  raw: RawData
) {
  const possibleArrays = [
    raw.email_account_ids,
    raw.email_accounts,
    raw.sender_account_ids,
    raw.senders,
  ];

  for (
    const value of
    possibleArrays
  ) {
    if (
      Array.isArray(value)
    ) {
      return value.length;
    }
  }

  const directValues = [
    raw.account_count,
    raw.accounts_count,
    raw.sender_count,
  ];

  for (
    const value of
    directValues
  ) {
    const number =
      getNumber(value);

    if (
      number !== null
    ) {
      return number;
    }
  }

  return null;
}

function normalizeStatus(
  value: string | null
) {
  if (!value) {
    return "UNKNOWN";
  }

  return value
    .trim()
    .toUpperCase();
}

function getText(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result || null;
}

function getNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function formatDate(
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

  return date.toLocaleDateString();
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

function StatusBadge({
  value,
}: {
  value: string;
}) {
  let background =
    "#F1F5F9";

  let color =
    "#475569";

  if (
    value === "ACTIVE"
  ) {
    background =
      "#ECFDF5";

    color =
      "#047857";
  }

  if (
    value === "PAUSED"
  ) {
    background =
      "#FEF3C7";

    color =
      "#B45309";
  }

  if (
    value === "STOPPED"
  ) {
    background =
      "#FEF2F2";

    color =
      "#B91C1C";
  }

  if (
    value === "DRAFT"
  ) {
    background =
      "#EFF6FF";

    color =
      "#2563EB";
  }

  return (
    <span
      style={{
        display:
          "inline-block",
        background,
        color,
        padding:
          "5px 8px",
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
          "11px 10px",
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
          "13px 10px",
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