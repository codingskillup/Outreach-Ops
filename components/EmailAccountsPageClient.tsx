"use client";

import { useMemo, useState } from "react";
import {
  accountRules,
  type AccountType,
} from "@/lib/accountRules";

import {
  emailAccountDemoData,
  type DemoEmailAccount,
} from "@/lib/emailAccountDemoData";

type StatusFilter =
  | "all"
  | "healthy"
  | "attention";

export default function EmailAccountsPageClient() {
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] =
    useState<"all" | AccountType>("all");
  const [client, setClient] = useState("all");
  const [smartlead, setSmartlead] = useState("all");
  const [status, setStatus] =
    useState<StatusFilter>("all");

  const accounts =
    emailAccountDemoData;

  const clients = Array.from(
    new Set(accounts.map((item) => item.client))
  );

  const smartleads = Array.from(
    new Set(accounts.map((item) => item.smartlead))
  );

  function getAccountStatus(
    account: DemoEmailAccount
  ) {
    const rule =
      accountRules[account.accountType];

    const dailyLimitCorrect =
      account.dailyLimit === rule.dailyLimit;

    const minimumGapCorrect =
      account.minimumGap === rule.minimumGap;

    const warmupEnabledCorrect =
      account.warmupEnabled ===
      rule.warmupEnabled;

    const warmupDailyCorrect =
      account.warmupDaily ===
      rule.warmupDaily;

    const healthy =
      dailyLimitCorrect &&
      minimumGapCorrect &&
      warmupEnabledCorrect &&
      warmupDailyCorrect;

    return {
      healthy,
      dailyLimitCorrect,
      minimumGapCorrect,
      warmupEnabledCorrect,
      warmupDailyCorrect,
    };
  }

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const accountStatus =
        getAccountStatus(account);

      const searchValue =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        account.email
          .toLowerCase()
          .includes(searchValue) ||
        account.client
          .toLowerCase()
          .includes(searchValue);

      const matchesType =
        accountType === "all" ||
        account.accountType === accountType;

      const matchesClient =
        client === "all" ||
        account.client === client;

      const matchesSmartlead =
        smartlead === "all" ||
        account.smartlead === smartlead;

      const matchesStatus =
        status === "all" ||
        (status === "healthy" &&
          accountStatus.healthy) ||
        (status === "attention" &&
          !accountStatus.healthy);

      return (
        matchesSearch &&
        matchesType &&
        matchesClient &&
        matchesSmartlead &&
        matchesStatus
      );
    });
  }, [
    accounts,
    search,
    accountType,
    client,
    smartlead,
    status,
  ]);

  const azureCount = accounts.filter(
    (item) =>
      item.accountType ===
      "Hypertide Azure/Entra"
  ).length;

  const hypertideGoogleCount =
    accounts.filter(
      (item) =>
        item.accountType ===
        "Hypertide Google"
    ).length;

  const workspaceCount =
    accounts.filter(
      (item) =>
        item.accountType ===
        "Google Workspace"
    ).length;

  const healthyCount =
    accounts.filter(
      (item) =>
        getAccountStatus(item).healthy
    ).length;

  const attentionCount =
    accounts.length - healthyCount;

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
          Review account types, sending settings,
          warmup status and configuration issues.
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
          title="Total Accounts"
          value={accounts.length.toString()}
        />

        <SummaryCard
          title="Hypertide Azure/Entra"
          value={azureCount.toString()}
        />

        <SummaryCard
          title="Hypertide Google"
          value={hypertideGoogleCount.toString()}
        />

        <SummaryCard
          title="Google Workspace"
          value={workspaceCount.toString()}
        />

        <SummaryCard
          title="Need Attention"
          value={attentionCount.toString()}
          warning
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
            placeholder="Search email or client"
            style={inputStyle}
          />

          <select
            value={accountType}
            onChange={(event) =>
              setAccountType(
                event.target.value as
                  | "all"
                  | AccountType
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
          </select>

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
              {filteredAccounts.length} shown
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              color: "#047857",
              background: "#ECFDF5",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {healthyCount} healthy
          </div>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1400,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                }}
              >
                <TableHeader text="Email" />
                <TableHeader text="Client" />
                <TableHeader text="Account Type" />
                <TableHeader text="Smartlead" />
                <TableHeader text="Daily Limit" />
                <TableHeader text="Minimum Gap" />
                <TableHeader text="Warmup" />
                <TableHeader text="Warmup Daily" />
                <TableHeader text="Reputation" />
                <TableHeader text="Bounce" />
                <TableHeader text="Reply" />
                <TableHeader text="Status" />
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.map(
                (account) => {
                  const rule =
                    accountRules[
                      account.accountType
                    ];

                  const accountStatus =
                    getAccountStatus(
                      account
                    );

                  return (
                    <tr
                      key={account.id}
                      style={{
                        borderTop:
                          "1px solid #F1F5F9",
                      }}
                    >
                      <TableCell>
                        <div
                          style={{
                            fontWeight: 600,
                            color:
                              "#111827",
                          }}
                        >
                          {account.email}
                        </div>
                      </TableCell>

                      <TableCell>
                        {account.client}
                      </TableCell>

                      <TableCell>
                        <TypeBadge
                          type={
                            account.accountType
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {account.smartlead}
                      </TableCell>

                      <TableCell>
                        <SettingValue
                          current={
                            account.dailyLimit
                          }
                          expected={
                            rule.dailyLimit
                          }
                          correct={
                            accountStatus.dailyLimitCorrect
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <SettingValue
                          current={
                            account.minimumGap
                          }
                          expected={
                            rule.minimumGap
                          }
                          correct={
                            accountStatus.minimumGapCorrect
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <BooleanValue
                          current={
                            account.warmupEnabled
                          }
                          expected={
                            rule.warmupEnabled
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <SettingValue
                          current={
                            account.warmupDaily
                          }
                          expected={
                            rule.warmupDaily
                          }
                          correct={
                            accountStatus.warmupDailyCorrect
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {account.warmupReputation}%
                      </TableCell>

                      <TableCell>
                        {account.bounceRate}%
                      </TableCell>

                      <TableCell>
                        {account.replyRate}%
                      </TableCell>

                      <TableCell>
                        <StatusBadge
                          healthy={
                            accountStatus.healthy
                          }
                        />
                      </TableCell>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
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
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
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
}: {
  text: string;
}) {
  return (
    <th
      style={{
        padding: "13px 14px",
        textAlign: "left",
        fontSize: 12,
        fontWeight: 600,
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
        padding: "14px",
        fontSize: 13,
        color: "#475569",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function TypeBadge({
  type,
}: {
  type: AccountType;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#F1F5F9",
        color: "#334155",
        borderRadius: 8,
        padding: "6px 9px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {type}
    </span>
  );
}

function SettingValue({
  current,
  expected,
  correct,
}: {
  current: number;
  expected: number;
  correct: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontWeight: 700,
          color: correct
            ? "#047857"
            : "#B45309",
        }}
      >
        {current}
      </div>

      {!correct && (
        <div
          style={{
            color: "#94A3B8",
            fontSize: 10,
            marginTop: 3,
          }}
        >
          Expected {expected}
        </div>
      )}
    </div>
  );
}

function BooleanValue({
  current,
  expected,
}: {
  current: boolean;
  expected: boolean;
}) {
  const correct =
    current === expected;

  return (
    <div>
      <span
        style={{
          background: correct
            ? "#ECFDF5"
            : "#FEF3C7",
          color: correct
            ? "#047857"
            : "#B45309",
          padding: "5px 8px",
          borderRadius: 7,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {current ? "ON" : "OFF"}
      </span>

      {!correct && (
        <div
          style={{
            marginTop: 4,
            color: "#94A3B8",
            fontSize: 10,
          }}
        >
          Expected{" "}
          {expected ? "ON" : "OFF"}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  healthy,
}: {
  healthy: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: healthy
          ? "#ECFDF5"
          : "#FEF3C7",
        color: healthy
          ? "#047857"
          : "#B45309",
        padding: "6px 9px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {healthy
        ? "Healthy"
        : "Needs Attention"}
    </span>
  );
}