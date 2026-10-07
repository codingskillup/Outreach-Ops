"use client";

import type {
  ReactNode,
} from "react";

import {
  useMemo,
  useState,
} from "react";

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

  accounts:
    | number
    | null;

  activeSince:
    | string
    | null;

  lastSynced:
    | string
    | null;
};

export default function CampaignsPageClient({
  realCampaigns,
  clientNamesById,
}: {
  realCampaigns:
    RealCampaign[];

  clientNamesById:
    Record<string, string>;
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] =
    useState("all");

  const [
    smartleadFilter,
    setSmartleadFilter,
  ] =
    useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const campaigns =
    useMemo(
      () =>
        realCampaigns.map(
          (campaign) =>
            convertRealCampaign(
              campaign,
              clientNamesById
            )
        ),
      [
        realCampaigns,
        clientNamesById,
      ]
    );

  const clients =
    useMemo(
      () =>
        Array.from(
          new Set(
            campaigns
              .map(
                (campaign) =>
                  campaign.client
              )
              .filter(
                (client) =>
                  client !==
                  "Unassigned"
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
              (campaign) =>
                campaign.smartlead
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
              (campaign) =>
                campaign.status
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
              .includes(
                value
              ) ||
            campaign.client
              .toLowerCase()
              .includes(
                value
              );

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
            Campaigns
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
            Monitor Smartlead
            campaigns, clients and
            campaign status.
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
          gap:
            14,
          marginBottom:
            22,
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
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr 1fr",
            gap:
              10,
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
            placeholder="Search campaign or client"
            style={
              inputStyle
            }
          />

          <select
            value={
              clientFilter
            }
            onChange={(
              event
            ) =>
              setClientFilter(
                event.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="all">
              All Clients
            </option>

            {clients.map(
              (client) => (
                <option
                  key={
                    client
                  }
                  value={
                    client
                  }
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
            onChange={(
              event
            ) =>
              setSmartleadFilter(
                event.target.value
              )
            }
            style={
              inputStyle
            }
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
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="all">
              All Status
            </option>

            {statuses.map(
              (status) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
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
              18,
            borderBottom:
              "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              fontSize:
                17,
              fontWeight:
                700,
            }}
          >
            Campaign Overview
          </div>

          <div
            style={{
              color:
                "#6B7280",
              fontSize:
                12,
              marginTop:
                4,
            }}
          >
            {
              filteredCampaigns.length
            }{" "}
            campaigns shown
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
                  text="Campaign"
                  width="24%"
                />

                <TableHeader
                  text="Client"
                  width="16%"
                />

                <TableHeader
                  text="Smartlead"
                  width="14%"
                />

                <TableHeader
                  text="Status"
                  width="10%"
                />

                <TableHeader
                  text="Accounts"
                  width="9%"
                />

                <TableHeader
                  text="Active Since"
                  width="13%"
                />

                <TableHeader
                  text="Last Synced"
                  width="14%"
                />
              </tr>
            </thead>

            <tbody>
              {filteredCampaigns.map(
                (
                  campaign
                ) => (
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
                      <span
                        style={{
                          color:
                            campaign.client ===
                            "Unassigned"
                              ? "#94A3B8"
                              : "#111827",

                          fontWeight:
                            campaign.client ===
                            "Unassigned"
                              ? 500
                              : 650,
                        }}
                      >
                        {
                          campaign.client
                        }
                      </span>
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
                        ? formatNumber(
                            campaign.accounts
                          )
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
                        : "—"}
                    </TableCell>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredCampaigns.length ===
          0 && (
          <div
            style={{
              padding:
                34,
              textAlign:
                "center",
              color:
                "#64748B",
              fontSize:
                13,
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
  campaign:
    RealCampaign,
  clientNamesById:
    Record<string, string>
): DisplayCampaign {
  const raw =
    campaign.raw_data ||
    {};

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
      getCampaignClient(
        raw,
        clientNamesById
      ),

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
  };
}

function getCampaignClient(
  raw: RawData,
  clientNamesById:
    Record<string, string>
) {
  const directName =
    getText(
      raw.client_name
    ) ||
    getText(
      raw.clientName
    );

  if (
    directName
  ) {
    return directName;
  }

  if (
    typeof raw.client ===
      "string"
  ) {
    const client =
      getText(
        raw.client
      );

    if (client) {
      return client;
    }
  }

  const clientObject =
    asObject(
      raw.client
    );

  const objectName =
    getText(
      clientObject.name
    ) ||
    getText(
      clientObject.client_name
    ) ||
    getText(
      clientObject.company_name
    );

  if (
    objectName
  ) {
    return objectName;
  }

  const clientId =
    getId(
      raw.client_id
    ) ||
    getId(
      raw.clientId
    );

  if (
    clientId &&
    clientNamesById[
      clientId
    ]
  ) {
    return clientNamesById[
      clientId
    ];
  }

  return "Unassigned";
}

function getCampaignAccountCount(
  raw: RawData
) {
  const possibleArrays = [
    raw.email_account_ids,
    raw.emailAccountIds,
    raw.email_accounts,
    raw.emailAccounts,
    raw.sender_account_ids,
    raw.sender_accounts,
    raw.senderAccounts,
    raw.senders,
  ];

  for (
    const value of
    possibleArrays
  ) {
    if (
      Array.isArray(
        value
      )
    ) {
      return value.length;
    }
  }

  const directValues = [
    raw.email_account_count,
    raw.email_accounts_count,
    raw.account_count,
    raw.accounts_count,
    raw.sender_count,
  ];

  for (
    const value of
    directValues
  ) {
    const number =
      getNumber(
        value
      );

    if (
      number !==
      null
    ) {
      return number;
    }
  }

  return null;
}

function normalizeStatus(
  value:
    | string
    | null
) {
  if (!value) {
    return "UNKNOWN";
  }

  return value
    .trim()
    .toUpperCase();
}

function asObject(
  value: unknown
): RawData {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as RawData;
  }

  return {};
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

function getId(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id =
    String(value)
      .trim();

  return id || null;
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

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(
    value
  );
}

function formatDate(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        "Asia/Karachi",
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    }
  ).format(
    date
  );
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        "Asia/Karachi",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hourCycle:
        "h23",
    }
  ).format(
    date
  );
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
    value ===
    "ACTIVE"
  ) {
    background =
      "#ECFDF5";

    color =
      "#047857";
  }

  if (
    value ===
    "PAUSED"
  ) {
    background =
      "#FEF3C7";

    color =
      "#B45309";
  }

  if (
    value ===
    "STOPPED"
  ) {
    background =
      "#FEF2F2";

    color =
      "#B91C1C";
  }

  if (
    value ===
      "DRAFT" ||
    value ===
      "DRAFTED"
  ) {
    background =
      "#EFF6FF";

    color =
      "#2563EB";
  }

  if (
    value ===
    "COMPLETED"
  ) {
    background =
      "#F1F5F9";

    color =
      "#475569";
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
        borderRadius:
          7,
        fontSize:
          9,
        fontWeight:
          700,
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
          color,
        }}
      >
        {formatNumber(
          value
        )}
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
        textAlign:
          "left",
        color:
          "#64748B",
        fontSize:
          10,
        fontWeight:
          650,
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
          "13px 10px",
        color:
          "#475569",
        fontSize:
          11,
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

const inputStyle = {
  width:
    "100%",
  minWidth:
    0,
  height:
    42,
  border:
    "1px solid #D1D5DB",
  borderRadius:
    9,
  padding:
    "0 11px",
  background:
    "#FFFFFF",
  color:
    "#111827",
  fontSize:
    13,
  outline:
    "none",
  boxSizing:
    "border-box" as const,
};