"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  emailAccountDemoData,
} from "@/lib/emailAccountDemoData";

import {
  accountRules,
  isAccountType,
  type AccountType,
} from "@/lib/accountRules";

type RawData =
  Record<string, unknown>;

type RealAccount = {
  id: string;
  external_id: number;
  email: string | null;
  from_name: string | null;
  username: string | null;
  account_type: string | null;
  raw_data: RawData | null;
  synced_at: string;
  integration_id: string;

  integrations:
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
};

type DisplayAccount = {
  id: string;
  email: string;
  client: string;
  smartlead: string;
  accountType:
    | AccountType
    | "Unclassified";

  dailyLimit: number | null;
  minimumGap: number | null;

  warmupEnabled:
    | boolean
    | null;

  warmupDaily:
    | number
    | null;

  reputation:
    | number
    | null;

  bounceRate:
    | number
    | null;

  replyRate:
    | number
    | null;

  live: boolean;
};

export default function EmailAccountsPageClient({
  realAccounts,
}: {
  realAccounts: RealAccount[];
}) {
  const [search, setSearch] =
    useState("");

  const [
    accountTypeFilter,
    setAccountTypeFilter,
  ] = useState("all");

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
    realAccounts.length > 0;

  const accounts:
    DisplayAccount[] =
    useMemo(() => {
      if (hasRealData) {
        return realAccounts.map(
          convertRealAccount
        );
      }

      return emailAccountDemoData.map(
        (
          account,
          index
        ) => ({
          id:
            String(
              (
                account as {
                  id?: string;
                }
              ).id ||
                `demo-${index}`
            ),

          email:
            account.email,

          client:
            account.client,

          smartlead:
            account.smartlead,

          accountType:
            account.accountType,

          dailyLimit:
            account.dailyLimit,

          minimumGap:
            account.minimumGap,

          warmupEnabled:
            account.warmupEnabled,

          warmupDaily:
            account.warmupDaily,

          reputation:
            account.warmupReputation,

          bounceRate:
            account.bounceRate,

          replyRate:
            account.replyRate,

          live: false,
        })
      );
    }, [
      hasRealData,
      realAccounts,
    ]);

  const clients =
    useMemo(
      () =>
        Array.from(
          new Set(
            accounts.map(
              (item) =>
                item.client
            )
          )
        ).sort(),
      [accounts]
    );

  const smartleads =
    useMemo(
      () =>
        Array.from(
          new Set(
            accounts.map(
              (item) =>
                item.smartlead
            )
          )
        ).sort(),
      [accounts]
    );

  const accountStatuses =
    useMemo(
      () =>
        accounts.map(
          (account) => ({
            account,
            healthy:
              isHealthyAccount(
                account
              ),
          })
        ),
      [accounts]
    );

  const filteredAccounts =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return accountStatuses.filter(
        ({
          account,
          healthy,
        }) => {
          const matchesSearch =
            !searchValue ||
            account.email
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            account.client
              .toLowerCase()
              .includes(
                searchValue
              );

          const matchesType =
            accountTypeFilter ===
              "all" ||
            account.accountType ===
              accountTypeFilter;

          const matchesClient =
            clientFilter ===
              "all" ||
            account.client ===
              clientFilter;

          const matchesSmartlead =
            smartleadFilter ===
              "all" ||
            account.smartlead ===
              smartleadFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "healthy" &&
              healthy) ||
            (statusFilter ===
              "attention" &&
              !healthy);

          return (
            matchesSearch &&
            matchesType &&
            matchesClient &&
            matchesSmartlead &&
            matchesStatus
          );
        }
      );
    }, [
      accountStatuses,
      search,
      accountTypeFilter,
      clientFilter,
      smartleadFilter,
      statusFilter,
    ]);

  const azureCount =
    accounts.filter(
      (account) =>
        account.accountType ===
        "Hypertide Azure/Entra"
    ).length;

  const googleCount =
    accounts.filter(
      (account) =>
        account.accountType ===
        "Hypertide Google"
    ).length;

  const workspaceCount =
    accounts.filter(
      (account) =>
        account.accountType ===
        "Google Workspace"
    ).length;

  const attentionCount =
    accountStatuses.filter(
      (item) =>
        !item.healthy
    ).length;

  const healthyCount =
    accountStatuses.filter(
      (item) =>
        item.healthy
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
            Email Accounts
          </h1>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 14,
            }}
          >
            Monitor sending
            settings and account
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
          title="Total Accounts"
          value={
            accounts.length
          }
        />

        <SummaryCard
          title="Hypertide Azure/Entra"
          value={
            azureCount
          }
        />

        <SummaryCard
          title="Hypertide Google"
          value={
            googleCount
          }
        />

        <SummaryCard
          title="Google Workspace"
          value={
            workspaceCount
          }
        />

        <SummaryCard
          title="Need Attention"
          value={
            attentionCount
          }
          warning
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
            placeholder="Search email or client"
            style={inputStyle}
          />

          <select
            value={
              accountTypeFilter
            }
            onChange={(event) =>
              setAccountTypeFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Account Types
            </option>

            <option value="Hypertide Azure/Entra">
              Hypertide Azure/Entra
            </option>

            <option value="Hypertide Google">
              Hypertide Google
            </option>

            <option value="Google Workspace">
              Google Workspace
            </option>

            <option value="Unclassified">
              Unclassified
            </option>
          </select>

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
              Accounts
            </div>

            <div
              style={{
                color: "#6B7280",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {
                filteredAccounts.length
              }{" "}
              shown
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              background:
                "#ECFDF5",
              color:
                "#047857",
              borderRadius: 8,
              padding:
                "7px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {healthyCount} healthy
          </div>
        </div>

        <div
          style={{
            width: "100%",
            overflow: "hidden",
          }}
        >
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
                  text="Email"
                  width="18%"
                />

                <TableHeader
                  text="Client"
                  width="11%"
                />

                <TableHeader
                  text="Account Type"
                  width="14%"
                />

                <TableHeader
                  text="Smartlead"
                  width="10%"
                />

                <TableHeader
                  text="Daily Limit"
                  width="7%"
                />

                <TableHeader
                  text="Minimum Gap"
                  width="8%"
                />

                <TableHeader
                  text="Warmup"
                  width="7%"
                />

                <TableHeader
                  text="Warmup Daily"
                  width="8%"
                />

                <TableHeader
                  text="Reputation"
                  width="8%"
                />

                <TableHeader
                  text="Bounce"
                  width="7%"
                />
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.map(
                ({
                  account,
                }) => (
                  <AccountRow
                    key={
                      account.id
                    }
                    account={
                      account
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredAccounts.length ===
          0 && (
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: "#64748B",
              fontSize: 13,
            }}
          >
            No email accounts
            found.
          </div>
        )}
      </div>
    </div>
  );
}

function AccountRow({
  account,
}: {
  account: DisplayAccount;
}) {
  const rules =
    isAccountType(
      account.accountType
    )
      ? accountRules[
          account.accountType
        ]
      : null;

  const dailyLimitWrong =
    rules !== null &&
    account.dailyLimit !==
      null &&
    account.dailyLimit !==
      rules.dailyLimit;

  const gapWrong =
    rules !== null &&
    account.minimumGap !==
      null &&
    account.minimumGap !==
      rules.minimumGap;

  const warmupWrong =
    rules !== null &&
    account.warmupEnabled !==
      null &&
    account.warmupEnabled !==
      rules.warmupEnabled;

  const warmupDailyWrong =
    rules !== null &&
    account.warmupDaily !==
      null &&
    account.warmupDaily !==
      rules.warmupDaily;

  return (
    <tr
      style={{
        borderTop:
          "1px solid #F1F5F9",
      }}
    >
      <TableCell>
        <div
          style={{
            fontWeight: 700,
            color: "#111827",
            overflow: "hidden",
            textOverflow:
              "ellipsis",
          }}
          title={account.email}
        >
          {account.email}
        </div>
      </TableCell>

      <TableCell>
        {account.client}
      </TableCell>

      <TableCell>
        <TypeBadge
          value={
            account.accountType
          }
        />
      </TableCell>

      <TableCell>
        {account.smartlead}
      </TableCell>

      <TableCell>
        <ValueCheck
          value={
            account.dailyLimit
          }
          wrong={
            dailyLimitWrong
          }
          expected={
            rules?.dailyLimit
          }
        />
      </TableCell>

      <TableCell>
        <ValueCheck
          value={
            account.minimumGap
          }
          wrong={
            gapWrong
          }
          expected={
            rules?.minimumGap
          }
        />
      </TableCell>

      <TableCell>
        {account.warmupEnabled ===
        null ? (
          <EmptyValue />
        ) : (
          <WarmupBadge
            enabled={
              account.warmupEnabled
            }
            wrong={
              warmupWrong
            }
          />
        )}
      </TableCell>

      <TableCell>
        <ValueCheck
          value={
            account.warmupDaily
          }
          wrong={
            warmupDailyWrong
          }
          expected={
            rules?.warmupDaily
          }
        />
      </TableCell>

      <TableCell>
        {account.reputation !==
        null
          ? `${account.reputation}%`
          : "—"}
      </TableCell>

      <TableCell>
        {account.bounceRate !==
        null
          ? `${account.bounceRate}%`
          : "—"}
      </TableCell>
    </tr>
  );
}

function convertRealAccount(
  account: RealAccount
): DisplayAccount {
  const raw =
    account.raw_data || {};

  const integration =
    Array.isArray(
      account.integrations
    )
      ? account.integrations[0]
      : account.integrations;

  const accountType =
    isAccountType(
      account.account_type
    )
      ? account.account_type
      : "Unclassified";

  return {
    id: account.id,

    email:
      account.email ||
      account.username ||
      "Unknown",

    client:
      getText(
        raw.client_name
      ) ||
      "Unassigned",

    smartlead:
      integration?.name ||
      "Smartlead",

    accountType,

    dailyLimit:
      getNumber(
        raw.max_email_per_day
      ),

    minimumGap:
      null,

    warmupEnabled:
      getBoolean(
        raw.warmup_enabled
      ),

    warmupDaily:
      getNumber(
        raw.total_warmup_per_day
      ),

    reputation:
      getNumber(
        raw.warmup_reputation
      ),

    bounceRate:
      getNumber(
        raw.bounce_rate
      ),

    replyRate:
      getNumber(
        raw.reply_rate_percentage
      ),

    live: true,
  };
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
      value.toLowerCase();

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

function isHealthyAccount(
  account: DisplayAccount
) {
  if (
    !isAccountType(
      account.accountType
    )
  ) {
    return false;
  }

  const rules =
    accountRules[
      account.accountType
    ];

  if (
    account.dailyLimit !==
      null &&
    account.dailyLimit !==
      rules.dailyLimit
  ) {
    return false;
  }

  if (
    account.minimumGap !==
      null &&
    account.minimumGap !==
      rules.minimumGap
  ) {
    return false;
  }

  if (
    account.warmupEnabled !==
      null &&
    account.warmupEnabled !==
      rules.warmupEnabled
  ) {
    return false;
  }

  if (
    account.warmupDaily !==
      null &&
    account.warmupDaily !==
      rules.warmupDaily
  ) {
    return false;
  }

  return true;
}

function SummaryCard({
  title,
  value,
  warning,
}: {
  title: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border:
          "1px solid #E5E7EB",
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
          color: warning
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
          "11px 10px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 650,
        color: "#64748B",
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
          "12px 10px",
        fontSize: 11,
        color: "#475569",
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

function TypeBadge({
  value,
}: {
  value:
    DisplayAccount["accountType"];
}) {
  return (
    <span
      style={{
        display:
          "inline-block",
        maxWidth: "100%",
        padding:
          "5px 7px",
        borderRadius: 7,
        background:
          value ===
          "Unclassified"
            ? "#F1F5F9"
            : "#EFF6FF",
        color:
          value ===
          "Unclassified"
            ? "#64748B"
            : "#334155",
        fontSize: 9,
        fontWeight: 700,
        overflow: "hidden",
        textOverflow:
          "ellipsis",
      }}
    >
      {value}
    </span>
  );
}

function ValueCheck({
  value,
  wrong,
  expected,
}: {
  value: number | null;
  wrong: boolean;
  expected?: number;
}) {
  if (value === null) {
    return <EmptyValue />;
  }

  return (
    <div>
      <div
        style={{
          color: wrong
            ? "#B45309"
            : "#047857",
          fontWeight: 700,
        }}
      >
        {value}
      </div>

      {wrong &&
        expected !==
          undefined && (
          <div
            style={{
              color:
                "#94A3B8",
              fontSize: 9,
              marginTop: 3,
            }}
          >
            Expected{" "}
            {expected}
          </div>
        )}
    </div>
  );
}

function WarmupBadge({
  enabled,
  wrong,
}: {
  enabled: boolean;
  wrong: boolean;
}) {
  return (
    <span
      style={{
        display:
          "inline-block",
        background:
          wrong
            ? "#FEF3C7"
            : "#ECFDF5",
        color:
          wrong
            ? "#B45309"
            : "#047857",
        padding:
          "5px 7px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {enabled
        ? "ON"
        : "OFF"}
    </span>
  );
}

function EmptyValue() {
  return (
    <span
      style={{
        color: "#94A3B8",
      }}
    >
      —
    </span>
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
  background: "#FFFFFF",
  color: "#111827",
  fontSize: 13,
  outline: "none",
  boxSizing:
    "border-box" as const,
};