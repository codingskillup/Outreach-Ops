import type { ReactNode } from "react";

import {
  Mail,
  CircleCheck,
  TriangleAlert,
  Megaphone,
  Globe2,
  Server,
  CircleAlert,
  CheckCircle2,
  Wifi,
  Users,
} from "lucide-react";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

type RawData = Record<string, unknown>;

type Integration = {
  id: string;
  name: string;
  provider: string;
  status: string | null;
  last_synced_at: string | null;
};

type EmailAccount = {
  id: string;
  account_type: string | null;
  raw_data: RawData | null;
  integration_id: string;
};

type Campaign = {
  id: string;
  name: string | null;
  status: string | null;
  raw_data: RawData | null;
  integration_id: string;
};

type SyncLog = {
  id: string;
  provider: string;
  accounts_fetched: number;
  campaigns_fetched: number;
  active_campaigns: number;
  status: string;
  message: string | null;
  created_at: string;
};

type DashboardLiveData = {
  integrations: Integration[];
  emailAccounts: EmailAccount[];
  campaigns: Campaign[];
  syncLogs: SyncLog[];
};

type ConnectionDisplay = {
  id: string;
  name: string;
  clients: string[];
  accounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  activeCampaigns: number;
  status: string;
  lastSynced: string | null;
};

const demoDashboard = {
  summary: {
    emailAccounts: 3648,
    healthyAccounts: 3520,
    needAttention: 128,
    activeCampaigns: 24,
    domains: 158,
  },

  todaysUpdate: {
    checkedAt: "8:04 AM",
    checkedAccounts: 3648,
    activeCampaigns: 24,
    domains: 158,
    newIssues: 12,
    resolved: 7,
  },

  accountHealth: {
    correctSettings: 3520,
    wrongDailyLimit: 42,
    warmupIssues: 31,
    connectionIssues: 8,
  },

  smartleadConnections: [
    {
      id: "demo-smartlead-main",
      name: "Smartlead Main",

      clients: [
        "TrialX",
        "Client Three",
        "Client Four",
        "Other Clients",
      ],

      accounts: 3098,

      azureEntra: 2853,

      hypertideGoogle: 222,

      googleWorkspace: 23,

      activeCampaigns: 10,

      status: "connected",

      lastSynced: null,
    },

    {
      id: "demo-smartlead-two",
      name: "Smartlead 2",

      clients: [
        "Reverba",
      ],

      accounts: 550,

      azureEntra: 520,

      hypertideGoogle: 30,

      googleWorkspace: 0,

      activeCampaigns: 14,

      status: "connected",

      lastSynced: null,
    },
  ] satisfies ConnectionDisplay[],

  recentIssues: [
    {
      title: "Daily limit needs attention",
      description:
        "Some sending accounts are using a daily limit different from the required account type setting.",
    },

    {
      title: "Warmup settings issue",
      description:
        "Some accounts have incorrect warmup settings and need review.",
    },

    {
      title: "EmailGuard domain issue",
      description:
        "A domain health check requires attention.",
    },
  ],
};

export default function DashboardShell({
  liveData,
}: {
  liveData: DashboardLiveData;
}) {
  const smartleadConnections =
    liveData.integrations.filter(
      (integration) =>
        integration.provider === "smartlead"
    );

  const hasLiveSmartlead =
    liveData.emailAccounts.length > 0 ||
    liveData.campaigns.length > 0;

  const activeCampaigns =
    liveData.campaigns.filter(
      (campaign) =>
        normalizeStatus(
          campaign.status
        ) === "ACTIVE"
    );

  const healthyAccounts =
    liveData.emailAccounts.filter(
      isHealthyAccount
    ).length;

  const totalAccounts =
    hasLiveSmartlead
      ? liveData.emailAccounts.length
      : demoDashboard.summary.emailAccounts;

  const healthy =
    hasLiveSmartlead
      ? healthyAccounts
      : demoDashboard.summary.healthyAccounts;

  const needAttention =
    hasLiveSmartlead
      ? Math.max(
          totalAccounts -
            healthyAccounts,
          0
        )
      : demoDashboard.summary.needAttention;

  const activeCampaignCount =
    hasLiveSmartlead
      ? activeCampaigns.length
      : demoDashboard.summary.activeCampaigns;

  const smartleadSyncLogs =
    liveData.syncLogs.filter(
      (log) =>
        log.provider === "smartlead"
    );

  const latestSync =
    smartleadSyncLogs[0] || null;

  const displayConnections:
    ConnectionDisplay[] =
    hasLiveSmartlead
      ? smartleadConnections.map(
          (connection) =>
            buildLiveConnection(
              connection,
              liveData.emailAccounts,
              liveData.campaigns
            )
        )
      : demoDashboard.smartleadConnections;

  const todayCheckedAccounts =
    hasLiveSmartlead
      ? latestSync?.accounts_fetched ??
        totalAccounts
      : demoDashboard.todaysUpdate
          .checkedAccounts;

  const todayActiveCampaigns =
    hasLiveSmartlead
      ? latestSync?.active_campaigns ??
        activeCampaignCount
      : demoDashboard.todaysUpdate
          .activeCampaigns;

  const checkedAt =
    hasLiveSmartlead &&
    latestSync
      ? formatTime(
          latestSync.created_at
        )
      : demoDashboard.todaysUpdate
          .checkedAt;

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
          alignItems: "flex-start",
          marginBottom: 25,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 27,
              fontWeight: 750,
            }}
          >
            Good morning
          </h2>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#64748B",
              fontSize: 14,
            }}
          >
            Here is your email infrastructure overview.
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",
            background:
              hasLiveSmartlead
                ? "#ECFDF5"
                : "#EFF6FF",
            color:
              hasLiveSmartlead
                ? "#047857"
                : "#2563EB",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {hasLiveSmartlead
            ? "Smartlead Live"
            : "Demo Mode"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard
          title="Email Accounts"
          value={totalAccounts}
          icon={
            <Mail size={18} />
          }
        />

        <StatCard
          title="Healthy Accounts"
          value={healthy}
          icon={
            <CircleCheck
              size={18}
            />
          }
          success
        />

        <StatCard
          title="Need Attention"
          value={needAttention}
          icon={
            <TriangleAlert
              size={18}
            />
          }
          warning
        />

        <StatCard
          title="Active Campaigns"
          value={activeCampaignCount}
          icon={
            <Megaphone
              size={18}
            />
          }
        />

        <StatCard
          title="Domains"
          value={
            demoDashboard.summary
              .domains
          }
          icon={
            <Globe2
              size={18}
            />
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1.35fr 0.65fr",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <div
          style={sectionStyle}
        >
          <SectionHeader
            title="Smartlead Connections"
            subtitle={
              hasLiveSmartlead
                ? "Live Smartlead account breakdown"
                : "Demo Smartlead account breakdown"
            }
          />

          <div
            style={{
              padding: 18,
              display: "grid",
              gap: 14,
            }}
          >
            {displayConnections.length ===
            0 ? (
              <EmptyState
                text="No Smartlead connections yet."
              />
            ) : (
              displayConnections.map(
                (connection) => (
                  <SmartleadConnectionCard
                    key={
                      connection.id
                    }
                    connection={
                      connection
                    }
                  />
                )
              )
            )}
          </div>
        </div>

        <div
          style={sectionStyle}
        >
          <SectionHeader
            title="Today's Update"
            subtitle={`Last check ${checkedAt}`}
          />

          <div
            style={{
              padding: 18,
            }}
          >
            <UpdateRow
              label="Accounts checked"
              value={
                todayCheckedAccounts
              }
            />

            <UpdateRow
              label="Active campaigns"
              value={
                todayActiveCampaigns
              }
            />

            <UpdateRow
              label="Domains checked"
              value={
                demoDashboard
                  .todaysUpdate
                  .domains
              }
            />

            <UpdateRow
              label="New issues"
              value={
                demoDashboard
                  .todaysUpdate
                  .newIssues
              }
              warning
            />

            <UpdateRow
              label="Resolved"
              value={
                demoDashboard
                  .todaysUpdate
                  .resolved
              }
              success
              last
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 18,
        }}
      >
        <div
          style={sectionStyle}
        >
          <SectionHeader
            title="Account Health"
            subtitle={
              hasLiveSmartlead
                ? "Based on synced Smartlead accounts"
                : "Demo account health overview"
            }
          />

          <div
            style={{
              padding: 18,
            }}
          >
            <HealthRow
              label="Correct Settings"
              value={healthy}
              success
            />

            <HealthRow
              label="Needs Review"
              value={needAttention}
              warning
            />

            {!hasLiveSmartlead && (
              <>
                <HealthRow
                  label="Wrong Daily Limit"
                  value={
                    demoDashboard
                      .accountHealth
                      .wrongDailyLimit
                  }
                  warning
                />

                <HealthRow
                  label="Warmup Issues"
                  value={
                    demoDashboard
                      .accountHealth
                      .warmupIssues
                  }
                  warning
                />

                <HealthRow
                  label="Connection Issues"
                  value={
                    demoDashboard
                      .accountHealth
                      .connectionIssues
                  }
                  danger
                  last
                />
              </>
            )}
          </div>
        </div>

        <div
          style={sectionStyle}
        >
          <SectionHeader
            title="Recent Issues"
            subtitle={
              hasLiveSmartlead
                ? "Issue engine will be connected next"
                : "Demo issue overview"
            }
          />

          <div
            style={{
              padding: 18,
            }}
          >
            {demoDashboard.recentIssues.map(
              (
                issue,
                index
              ) => {
                const last =
                  index ===
                  demoDashboard
                    .recentIssues
                    .length -
                    1;

                return (
                  <div
                    key={`${issue.title}-${index}`}
                    style={{
                      display: "flex",
                      alignItems:
                        "flex-start",
                      gap: 10,
                      paddingBottom:
                        last
                          ? 0
                          : 14,
                      marginBottom:
                        last
                          ? 0
                          : 14,
                      borderBottom:
                        last
                          ? "none"
                          : "1px solid #F1F5F9",
                    }}
                  >
                    <div
                      style={{
                        width: 31,
                        height: 31,
                        flexShrink: 0,
                        borderRadius: 8,
                        background:
                          "#FEF3C7",
                        color:
                          "#B45309",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                    >
                      <CircleAlert
                        size={15}
                      />
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            "#111827",
                          fontWeight: 700,
                        }}
                      >
                        {issue.title}
                      </div>

                      <div
                        style={{
                          color:
                            "#64748B",
                          fontSize: 11,
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {
                          issue.description
                        }
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartleadConnectionCard({
  connection,
}: {
  connection: ConnectionDisplay;
}) {
  const connected =
    connection.status ===
    "connected";

  return (
    <div
      style={{
        border:
          "1px solid #E5E7EB",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 15,
          display: "flex",
          alignItems: "center",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "#F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            marginRight: 12,
          }}
        >
          <Server
            size={19}
            color="#334155"
          />
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 750,
              color: "#111827",
            }}
          >
            {connection.name}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 5,
              color: "#64748B",
              fontSize: 11,
            }}
          >
            <Users size={12} />

            <span>
              {formatClients(
                connection.clients
              )}
            </span>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background:
              connected
                ? "#ECFDF5"
                : "#FEF3C7",
            color:
              connected
                ? "#047857"
                : "#B45309",
            borderRadius: 7,
            padding: "6px 8px",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <Wifi size={12} />

          {connected
            ? "Connected"
            : connection.status}
        </div>
      </div>

      <div
        style={{
          borderTop:
            "1px solid #F1F5F9",
          background: "#F8FAFC",
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
        }}
      >
        <ConnectionMetric
          label="Total Accounts"
          value={
            connection.accounts
          }
        />

        <ConnectionMetric
          label="Azure / Entra"
          value={
            connection.azureEntra
          }
          success
        />

        <ConnectionMetric
          label="Hypertide Google"
          value={
            connection.hypertideGoogle
          }
        />

        <ConnectionMetric
          label="Google Workspace"
          value={
            connection.googleWorkspace
          }
        />

        <ConnectionMetric
          label="Active Campaigns"
          value={
            connection.activeCampaigns
          }
        />
      </div>

      {connection.lastSynced && (
        <div
          style={{
            padding:
              "8px 15px",
            borderTop:
              "1px solid #F1F5F9",
            color:
              "#94A3B8",
            fontSize: 10,
          }}
        >
          Last synced{" "}
          {formatDateTime(
            connection.lastSynced
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionMetric({
  label,
  value,
  success,
}: {
  label: string;
  value: number;
  success?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "12px 10px",
        borderRight:
          "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "#64748B",
          marginBottom: 5,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 750,
          color: success
            ? "#047857"
            : "#111827",
        }}
      >
        {safeNumber(
          value
        ).toLocaleString()}
      </div>
    </div>
  );
}

function buildLiveConnection(
  connection: Integration,
  allAccounts: EmailAccount[],
  allCampaigns: Campaign[]
): ConnectionDisplay {
  const accounts =
    allAccounts.filter(
      (account) =>
        account.integration_id ===
        connection.id
    );

  const campaigns =
    allCampaigns.filter(
      (campaign) =>
        campaign.integration_id ===
        connection.id
    );

  const azureEntra =
    accounts.filter(
      (account) =>
        account.account_type ===
        "Hypertide Azure/Entra"
    ).length;

  const hypertideGoogle =
    accounts.filter(
      (account) =>
        account.account_type ===
        "Hypertide Google"
    ).length;

  const googleWorkspace =
    accounts.filter(
      (account) =>
        account.account_type ===
        "Google Workspace"
    ).length;

  const activeCampaigns =
    campaigns.filter(
      (campaign) =>
        normalizeStatus(
          campaign.status
        ) === "ACTIVE"
    ).length;

  const clients =
    getConnectionClients(
      accounts,
      campaigns
    );

  return {
    id: connection.id,

    name:
      connection.name,

    clients,

    accounts:
      accounts.length,

    azureEntra,

    hypertideGoogle,

    googleWorkspace,

    activeCampaigns,

    status:
      connection.status ||
      "connected",

    lastSynced:
      connection.last_synced_at,
  };
}

function getConnectionClients(
  accounts: EmailAccount[],
  campaigns: Campaign[]
) {
  const names =
    new Set<string>();

  for (
    const account of accounts
  ) {
    const raw =
      account.raw_data || {};

    const name =
      getText(
        raw.client_name
      ) ||
      getText(
        raw.clientName
      ) ||
      getText(
        raw.client
      );

    if (name) {
      names.add(name);
    }
  }

  for (
    const campaign of campaigns
  ) {
    const raw =
      campaign.raw_data || {};

    const name =
      getText(
        raw.client_name
      ) ||
      getText(
        raw.clientName
      ) ||
      getText(
        raw.client
      );

    if (name) {
      names.add(name);
    }
  }

  if (
    names.size === 0
  ) {
    return [
      "Unassigned",
    ];
  }

  return Array.from(
    names
  ).sort();
}

function formatClients(
  clients: string[]
) {
  if (
    clients.length === 0
  ) {
    return "No client";
  }

  if (
    clients.length <= 3
  ) {
    return clients.join(", ");
  }

  const first =
    clients.slice(0, 3);

  return `${first.join(
    ", "
  )} +${
    clients.length - 3
  } more`;
}

function isHealthyAccount(
  account: EmailAccount
) {
  if (
    !isAccountType(
      account.account_type
    )
  ) {
    return false;
  }

  const rule =
    accountRules[
      account.account_type
    ];

  const raw =
    account.raw_data || {};

  const dailyLimit =
    getNumber(
      raw.max_email_per_day
    );

  const warmupEnabled =
    getBoolean(
      raw.warmup_enabled
    );

  const warmupDaily =
    getNumber(
      raw.total_warmup_per_day
    );

  if (
    dailyLimit !== null &&
    dailyLimit !==
      rule.dailyLimit
  ) {
    return false;
  }

  if (
    warmupEnabled !== null &&
    warmupEnabled !==
      rule.warmupEnabled
  ) {
    return false;
  }

  if (
    warmupDaily !== null &&
    warmupDaily !==
      rule.warmupDaily
  ) {
    return false;
  }

  return true;
}

function normalizeStatus(
  value: string | null
) {
  return (
    value
      ?.trim()
      .toUpperCase() ||
    "UNKNOWN"
  );
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

function getBoolean(
  value: unknown
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (value === 1) {
    return true;
  }

  if (value === 0) {
    return false;
  }

  if (
    typeof value ===
    "string"
  ) {
    const text =
      value
        .trim()
        .toLowerCase();

    if (
      text === "true" ||
      text === "1"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0"
    ) {
      return false;
    }
  }

  return null;
}

function safeNumber(
  value:
    | number
    | null
    | undefined
) {
  return typeof value ===
    "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function StatCard({
  title,
  value,
  icon,
  success,
  warning,
}: {
  title: string;
  value:
    | number
    | null
    | undefined;
  icon: ReactNode;
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
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
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
            color:
              "#64748B",
            fontSize: 11,
            marginLeft: 10,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 25,
          fontWeight: 750,
          color,
        }}
      >
        {safeNumber(
          value
        ).toLocaleString()}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderBottom:
          "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 4,
          color:
            "#64748B",
          fontSize: 11,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function UpdateRow({
  label,
  value,
  success,
  warning,
  last,
}: {
  label: string;
  value?:
    | number
    | null;
  success?: boolean;
  warning?: boolean;
  last?: boolean;
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

  const safeValue =
    safeNumber(value);

  return (
    <div
      style={{
        minHeight: 39,
        display: "flex",
        alignItems: "center",
        borderBottom:
          last
            ? "none"
            : "1px solid #F1F5F9",
      }}
    >
      <span
        style={{
          color:
            "#64748B",
          fontSize: 12,
        }}
      >
        {label}
      </span>

      <span
        style={{
          marginLeft:
            "auto",
          color,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {safeValue.toLocaleString()}
      </span>
    </div>
  );
}

function HealthRow({
  label,
  value,
  success,
  warning,
  danger,
  last,
}: {
  label: string;
  value?:
    | number
    | null;
  success?: boolean;
  warning?: boolean;
  danger?: boolean;
  last?: boolean;
}) {
  let color =
    "#475569";

  let iconBackground =
    "#F1F5F9";

  if (success) {
    color =
      "#047857";

    iconBackground =
      "#ECFDF5";
  }

  if (warning) {
    color =
      "#B45309";

    iconBackground =
      "#FEF3C7";
  }

  if (danger) {
    color =
      "#B91C1C";

    iconBackground =
      "#FEF2F2";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        paddingBottom:
          last
            ? 0
            : 13,
        marginBottom:
          last
            ? 0
            : 13,
        borderBottom:
          last
            ? "none"
            : "1px solid #F1F5F9",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background:
            iconBackground,
          color,
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        {success ? (
          <CheckCircle2
            size={14}
          />
        ) : (
          <TriangleAlert
            size={14}
          />
        )}
      </div>

      <div
        style={{
          marginLeft: 10,
          color:
            "#475569",
          fontSize: 12,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginLeft:
            "auto",
          fontSize: 12,
          fontWeight: 700,
          color,
        }}
      >
        {safeNumber(
          value
        ).toLocaleString()}
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding: 22,
        color:
          "#64748B",
        textAlign:
          "center",
        fontSize: 12,
      }}
    >
      {text}
    </div>
  );
}

function formatTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
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
    return "Unknown";
  }

  return date.toLocaleString();
}

const sectionStyle = {
  background:
    "#FFFFFF",
  border:
    "1px solid #E5E7EB",
  borderRadius: 14,
  overflow: "hidden",
};