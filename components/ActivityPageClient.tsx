"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  RefreshCw,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";

import {
  activityDemoData,
} from "@/lib/activityDemoData";

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

type Issue = {
  id: string;
  source: string;
  client: string | null;
  issue_type: string;
  item: string;
  severity: string;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

type ActivityStatus =
  | "Success"
  | "Warning"
  | "Failed";

type ActivityRecord = {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  status: ActivityStatus;
  createdAt: string;
  live: boolean;
};

export default function ActivityPageClient({
  syncLogs = [],
  issues = [],
}: {
  syncLogs?: SyncLog[];
  issues?: Issue[];
}) {
  const [search, setSearch] =
    useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState("all");

  const hasLiveData =
    syncLogs.length > 0 ||
    issues.length > 0;

  const activities =
    useMemo<ActivityRecord[]>(
      () => {
        if (!hasLiveData) {
          return activityDemoData.map(
            (
              activity,
              index
            ) => ({
              id:
                activity.id ||
                `demo-${index}`,

              type:
                activity.type,

              title:
                activity.title,

              description:
                activity.description,

              source:
                activity.source,

              status:
                activity.status,

              createdAt:
                demoDateFromLabel(
                  activity.date,
                  activity.time
                ),

              live: false,
            })
          );
        }

        const rows:
          ActivityRecord[] =
          [];

        for (
          const log of syncLogs
        ) {
          const provider =
            formatProvider(
              log.provider
            );

          const success =
            log.status
              .toLowerCase() ===
            "success";

          rows.push({
            id:
              `sync-${log.id}`,

            type:
              "Sync",

            title:
              success
                ? `${provider} sync completed`
                : `${provider} sync failed`,

            description:
              success
                ? buildSyncDescription(
                    log
                  )
                : log.message ||
                  "The sync could not be completed.",

            source:
              provider,

            status:
              success
                ? "Success"
                : "Failed",

            createdAt:
              log.created_at,

            live: true,
          });
        }

        for (
          const issue of issues
        ) {
          rows.push({
            id:
              `issue-open-${issue.id}`,

            type:
              "Issue Found",

            title:
              issue.issue_type,

            description:
              buildIssueDescription(
                issue
              ),

            source:
              issue.source,

            status:
              issue.severity ===
              "Critical"
                ? "Failed"
                : "Warning",

            createdAt:
              issue.first_seen_at,

            live: true,
          });

          if (
            issue.status ===
              "Resolved" &&
            issue.resolved_at
          ) {
            rows.push({
              id:
                `issue-resolved-${issue.id}`,

              type:
                "Issue Resolved",

              title:
                `${issue.issue_type} resolved`,

              description:
                `${issue.item} is no longer showing this issue.`,

              source:
                issue.source,

              status:
                "Success",

              createdAt:
                issue.resolved_at,

              live: true,
            });
          }
        }

        return rows.sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );
      },
      [
        hasLiveData,
        syncLogs,
        issues,
      ]
    );

  const types =
    useMemo(
      () =>
        Array.from(
          new Set(
            activities.map(
              (item) =>
                item.type
            )
          )
        ).sort(),
      [activities]
    );

  const sources =
    useMemo(
      () =>
        Array.from(
          new Set(
            activities.map(
              (item) =>
                item.source
            )
          )
        ).sort(),
      [activities]
    );

  const filteredActivities =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return activities.filter(
        (activity) => {
          const matchesSearch =
            !value ||
            activity.title
              .toLowerCase()
              .includes(value) ||
            activity.description
              .toLowerCase()
              .includes(value) ||
            activity.source
              .toLowerCase()
              .includes(value);

          const matchesType =
            typeFilter ===
              "all" ||
            activity.type ===
              typeFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            activity.status ===
              statusFilter;

          const matchesSource =
            sourceFilter ===
              "all" ||
            activity.source ===
              sourceFilter;

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus &&
            matchesSource
          );
        }
      );
    }, [
      activities,
      search,
      typeFilter,
      statusFilter,
      sourceFilter,
    ]);

  const successful =
    activities.filter(
      (activity) =>
        activity.status ===
        "Success"
    ).length;

  const warnings =
    activities.filter(
      (activity) =>
        activity.status ===
        "Warning"
    ).length;

  const failed =
    activities.filter(
      (activity) =>
        activity.status ===
        "Failed"
    ).length;

  const today =
    activities.filter(
      (activity) =>
        isToday(
          activity.createdAt
        )
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
            Activity
          </h1>

          <p
            style={{
              marginTop: 7,
              marginBottom: 0,
              color: "#64748B",
              fontSize: 14,
            }}
          >
            Review sync history,
            detected issues and
            resolved items.
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",

            background:
              hasLiveData
                ? "#ECFDF5"
                : "#EFF6FF",

            color:
              hasLiveData
                ? "#047857"
                : "#2563EB",

            padding:
              "7px 10px",

            borderRadius: 8,

            fontSize: 11,

            fontWeight: 700,
          }}
        >
          {hasLiveData
            ? "Live Data"
            : "Demo Mode"}
        </div>
      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",

          gap: 14,

          marginBottom: 22,
        }}
      >
        <SummaryCard
          title="Today's Activity"
          value={today}
        />

        <SummaryCard
          title="Successful"
          value={successful}
          success
        />

        <SummaryCard
          title="Warnings"
          value={warnings}
          warning
        />

        <SummaryCard
          title="Failed"
          value={failed}
          danger
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
            placeholder="Search activity"
            style={inputStyle}
          />

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Activity
            </option>

            {types.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </select>

          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Sources
            </option>

            {sources.map(
              (source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
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

            <option value="Success">
              Success
            </option>

            <option value="Warning">
              Warning
            </option>

            <option value="Failed">
              Failed
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
          }}
        >
          <div
            style={{
              fontSize: 17,

              fontWeight: 700,
            }}
          >
            Activity History
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
              filteredActivities.length
            }{" "}
            records shown
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
                text="Type"
                width="13%"
              />

              <TableHeader
                text="Activity"
                width="22%"
              />

              <TableHeader
                text="Details"
                width="33%"
              />

              <TableHeader
                text="Source"
                width="12%"
              />

              <TableHeader
                text="Status"
                width="10%"
              />

              <TableHeader
                text="Date"
                width="10%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredActivities.map(
              (activity) => (
                <tr
                  key={
                    activity.id
                  }
                  style={{
                    borderTop:
                      "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    <TypeDisplay
                      type={
                        activity.type
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <div
                      style={{
                        color:
                          "#111827",

                        fontWeight: 700,

                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                      title={
                        activity.title
                      }
                    >
                      {
                        activity.title
                      }
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      style={{
                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                      title={
                        activity.description
                      }
                    >
                      {
                        activity.description
                      }
                    </div>
                  </TableCell>

                  <TableCell>
                    {
                      activity.source
                    }
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      status={
                        activity.status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {formatDateTime(
                      activity.createdAt
                    )}
                  </TableCell>
                </tr>
              )
            )}
          </tbody>
        </table>

        {filteredActivities.length ===
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
            No activity found.
          </div>
        )}
      </div>
    </div>
  );
}

function buildSyncDescription(
  log: SyncLog
) {
  const parts = [
    `${safeNumber(
      log.accounts_fetched
    ).toLocaleString()} accounts`,
    `${safeNumber(
      log.campaigns_fetched
    ).toLocaleString()} campaigns`,
    `${safeNumber(
      log.active_campaigns
    ).toLocaleString()} active`,
  ];

  return parts.join(" · ");
}

function buildIssueDescription(
  issue: Issue
) {
  const client =
    issue.client ||
    "Unassigned";

  return `${issue.item} · ${client} · ${issue.severity}`;
}

function formatProvider(
  value: string
) {
  if (
    value.toLowerCase() ===
    "smartlead"
  ) {
    return "Smartlead";
  }

  if (
    value.toLowerCase() ===
    "emailguard"
  ) {
    return "EmailGuard";
  }

  return value;
}

function TypeDisplay({
  type,
}: {
  type: string;
}) {
  let icon =
    <RefreshCw
      size={14}
    />;

  let background =
    "#EFF6FF";

  let color =
    "#2563EB";

  if (
    type === "Issue Found"
  ) {
    icon =
      <TriangleAlert
        size={14}
      />;

    background =
      "#FEF3C7";

    color =
      "#B45309";
  }

  if (
    type ===
    "Issue Resolved"
  ) {
    icon =
      <CheckCircle2
        size={14}
      />;

    background =
      "#ECFDF5";

    color =
      "#047857";
  }

  return (
    <div
      style={{
        width: 30,

        height: 30,

        borderRadius: 8,

        background,

        color,

        display: "flex",

        alignItems:
          "center",

        justifyContent:
          "center",
      }}
      title={type}
    >
      {icon}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ActivityStatus;
}) {
  let background =
    "#ECFDF5";

  let color =
    "#047857";

  if (
    status === "Warning"
  ) {
    background =
      "#FEF3C7";

    color =
      "#B45309";
  }

  if (
    status === "Failed"
  ) {
    background =
      "#FEF2F2";

    color =
      "#B91C1C";
  }

  return (
    <span
      style={{
        display:
          "inline-block",

        background,

        color,

        padding:
          "5px 7px",

        borderRadius: 7,

        fontSize: 9,

        fontWeight: 700,
      }}
    >
      {status}
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
        {safeNumber(
          value
        ).toLocaleString()}
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
          "12px 10px",

        color:
          "#475569",

        fontSize: 11,

        verticalAlign:
          "middle",

        overflow:
          "hidden",
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

function isToday(
  value: string
) {
  const date =
    new Date(value);

  const today =
    new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
}

function demoDateFromLabel(
  dateLabel: string,
  timeLabel: string
) {
  const now =
    new Date();

  const date =
    new Date(now);

  if (
    dateLabel ===
    "Yesterday"
  ) {
    date.setDate(
      date.getDate() - 1
    );
  }

  const match =
    timeLabel.match(
      /(\d+):(\d+)\s*(AM|PM)/i
    );

  if (match) {
    let hour =
      Number(match[1]);

    const minute =
      Number(match[2]);

    const period =
      match[3].toUpperCase();

    if (
      period === "PM" &&
      hour !== 12
    ) {
      hour += 12;
    }

    if (
      period === "AM" &&
      hour === 12
    ) {
      hour = 0;
    }

    date.setHours(
      hour,
      minute,
      0,
      0
    );
  }

  return date.toISOString();
}

function safeNumber(
  value:
    | number
    | null
    | undefined
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  )
    ? value
    : 0;
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