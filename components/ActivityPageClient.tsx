"use client";

import { useMemo, useState } from "react";

import {
  activityDemoData,
  type ActivityStatus,
//   type ActivityType,
} from "@/lib/activityDemoData";

type FilterValue = "all" | string;

export default function ActivityPageClient() {
  const [search, setSearch] = useState("");
  const [type, setType] =
    useState<FilterValue>("all");
  const [status, setStatus] =
    useState<FilterValue>("all");
  const [date, setDate] =
    useState<FilterValue>("all");

  const activities = activityDemoData;

  const successCount =
    activities.filter(
      (item) =>
        item.status === "Success"
    ).length;

  const warningCount =
    activities.filter(
      (item) =>
        item.status === "Warning"
    ).length;

  const failedCount =
    activities.filter(
      (item) =>
        item.status === "Failed"
    ).length;

  const todayCount =
    activities.filter(
      (item) =>
        item.date === "Today"
    ).length;

  const filteredActivities =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return activities.filter(
        (activity) => {
          const matchesSearch =
            !searchValue ||
            activity.title
              .toLowerCase()
              .includes(searchValue) ||
            activity.description
              .toLowerCase()
              .includes(searchValue) ||
            activity.source
              .toLowerCase()
              .includes(searchValue);

          const matchesType =
            type === "all" ||
            activity.type === type;

          const matchesStatus =
            status === "all" ||
            activity.status === status;

          const matchesDate =
            date === "all" ||
            activity.date === date;

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus &&
            matchesDate
          );
        }
      );
    }, [
      activities,
      search,
      type,
      status,
      date,
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
          Activity
        </h1>

        <p
          style={{
            marginTop: 7,
            marginBottom: 0,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          Review daily checks, sync history,
          detected issues and resolved items.
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
          title="Today's Activity"
          value={todayCount.toString()}
        />

        <SummaryCard
          title="Successful"
          value={successCount.toString()}
          success
        />

        <SummaryCard
          title="Warnings"
          value={warningCount.toString()}
          warning
        />

        <SummaryCard
          title="Failed"
          value={failedCount.toString()}
          danger
        />

        <SummaryCard
          title="Daily Check"
          value="8:00 AM"
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
              setSearch(
                event.target.value
              )
            }
            placeholder="Search activity"
            style={inputStyle}
          />

          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Activity
            </option>

            <option value="Daily Sync">
              Daily Sync
            </option>

            <option value="Smartlead Sync">
              Smartlead Sync
            </option>

            <option value="EmailGuard Sync">
              EmailGuard Sync
            </option>

            <option value="Issue Found">
              Issue Found
            </option>

            <option value="Issue Resolved">
              Issue Resolved
            </option>

            <option value="Manual Refresh">
              Manual Refresh
            </option>
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
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

          <select
            value={date}
            onChange={(event) =>
              setDate(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="all">
              All Dates
            </option>

            <option value="Today">
              Today
            </option>

            <option value="Yesterday">
              Yesterday
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
            Activity History
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 4,
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
            tableLayout: "fixed",
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
                text="Activity"
                width="14%"
              />

              <TableHeader
                text="Details"
                width="35%"
              />

              <TableHeader
                text="Source"
                width="15%"
              />

              <TableHeader
                text="Status"
                width="10%"
              />

              <TableHeader
                text="Date"
                width="10%"
              />

              <TableHeader
                text="Time"
                width="10%"
              />
            </tr>
          </thead>

          <tbody>
            {filteredActivities.map(
              (activity) => (
                <tr
                  key={activity.id}
                  style={{
                    borderTop:
                      "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    <div
                      style={{
                        fontWeight: 700,
                        color:
                          "#111827",
                      }}
                    >
                      {
                        activity.title
                      }
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color:
                          "#94A3B8",
                        fontSize: 10,
                      }}
                    >
                      {
                        activity.type
                      }
                    </div>
                  </TableCell>

                  <TableCell>
                    {
                      activity.description
                    }
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
                    {activity.date}
                  </TableCell>

                  <TableCell>
                    {activity.time}
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
              padding: 32,
              textAlign: "center",
              color: "#64748B",
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
        padding: "11px 10px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 650,
        color: "#64748B",
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
        padding: "13px 10px",
        fontSize: 11,
        color: "#475569",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
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

  if (status === "Warning") {
    background =
      "#FEF3C7";
    color =
      "#B45309";
  }

  if (status === "Failed") {
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
        padding: "5px 8px",
        borderRadius: 7,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}