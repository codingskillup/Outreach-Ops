"use client";

import Link from "next/link";
import type { ClientDetail } from "@/lib/clientDetailDemoData";

export default function ClientDetailPage({
  client,
}: {
  client: ClientDetail;
}) {
  const health =
    client.totalAccounts > 0
      ? (
          (client.healthyAccounts /
            client.totalAccounts) *
          100
        ).toFixed(1)
      : "0";

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
        <Link
          href="/clients"
          style={{
            color: "#2563EB",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to Clients
        </Link>

        <h1
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 28,
            fontWeight: 750,
          }}
        >
          {client.name}
        </h1>

        <p
          style={{
            marginTop: 7,
            marginBottom: 0,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          Account health, account types, campaigns and current issues.
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
          value={client.totalAccounts.toLocaleString()}
        />

        <SummaryCard
          title="Healthy"
          value={client.healthyAccounts.toLocaleString()}
          success
        />

        <SummaryCard
          title="Need Attention"
          value={client.issues.toLocaleString()}
          warning
        />

        <SummaryCard
          title="Active Campaigns"
          value={client.activeCampaigns.toLocaleString()}
        />

        <SummaryCard
          title="Account Health"
          value={`${health}%`}
          success={Number(health) >= 95}
          warning={Number(health) < 95}
        />
      </div>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 14,
          padding: 22,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          Account Types
        </div>

        <p
          style={{
            marginTop: 5,
            color: "#6B7280",
            fontSize: 13,
          }}
        >
          Mailbox distribution for this client
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          <TypeCard
            title="Hypertide Azure/Entra"
            value={client.azureEntra}
            total={client.totalAccounts}
          />

          <TypeCard
            title="Hypertide Google"
            value={client.hypertideGoogle}
            total={client.totalAccounts}
          />

          <TypeCard
            title="Google Workspace"
            value={client.googleWorkspace}
            total={client.totalAccounts}
          />
        </div>
      </section>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Campaigns
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 13,
              marginTop: 5,
            }}
          >
            Campaign activity for {client.name}
          </div>
        </div>

        {client.campaigns.length === 0 ? (
          <EmptyState text="No demo campaigns available for this client." />
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                }}
              >
                <TableHeader text="Campaign" />
                <TableHeader text="Status" />
                <TableHeader text="Accounts" />
                <TableHeader text="Active Since" />
              </tr>
            </thead>

            <tbody>
              {client.campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  style={{
                    borderTop: "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    <span
                      style={{
                        fontWeight: 650,
                        color: "#111827",
                      }}
                    >
                      {campaign.name}
                    </span>
                  </TableCell>

                  <TableCell>
                    <CampaignStatus
                      status={campaign.status}
                    />
                  </TableCell>

                  <TableCell>
                    {campaign.accounts}
                  </TableCell>

                  <TableCell>
                    {campaign.activeSince}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Current Issues
          </div>

          <div
            style={{
              color: "#6B7280",
              fontSize: 13,
              marginTop: 5,
            }}
          >
            Recent items that need attention
          </div>
        </div>

        {client.recentIssues.length === 0 ? (
          <EmptyState text="No current demo issues." />
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                }}
              >
                <TableHeader text="Issue" />
                <TableHeader text="Account" />
                <TableHeader text="Severity" />
              </tr>
            </thead>

            <tbody>
              {client.recentIssues.map((issue) => (
                <tr
                  key={issue.id}
                  style={{
                    borderTop: "1px solid #F1F5F9",
                  }}
                >
                  <TableCell>
                    {issue.type}
                  </TableCell>

                  <TableCell>
                    {issue.item}
                  </TableCell>

                  <TableCell>
                    <IssueStatus
                      severity={issue.severity}
                    />
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  warning,
  success,
}: {
  title: string;
  value: string;
  warning?: boolean;
  success?: boolean;
}) {
  let color = "#111827";

  if (warning) {
    color = "#B45309";
  }

  if (success) {
    color = "#047857";
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

function TypeCard({
  title,
  value,
  total,
}: {
  title: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? ((value / total) * 100).toFixed(1)
      : "0";

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 11,
        padding: 17,
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
          fontSize: 24,
          fontWeight: 750,
          marginTop: 8,
        }}
      >
        {value.toLocaleString()}
      </div>

      <div
        style={{
          color: "#94A3B8",
          fontSize: 11,
          marginTop: 5,
        }}
      >
        {percentage}% of client accounts
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
        textAlign: "left",
        padding: "13px 16px",
        fontSize: 12,
        color: "#64748B",
        fontWeight: 600,
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
        padding: "14px 16px",
        color: "#475569",
        fontSize: 13,
      }}
    >
      {children}
    </td>
  );
}

function CampaignStatus({
  status,
}: {
  status: "ACTIVE" | "PAUSED";
}) {
  const active =
    status === "ACTIVE";

  return (
    <span
      style={{
        background: active
          ? "#ECFDF5"
          : "#FEF3C7",
        color: active
          ? "#047857"
          : "#B45309",
        borderRadius: 8,
        padding: "6px 9px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}

function IssueStatus({
  severity,
}: {
  severity: "Warning" | "Critical";
}) {
  return (
    <span
      style={{
        background: "#FEF3C7",
        color: "#B45309",
        borderRadius: 8,
        padding: "6px 9px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {severity}
    </span>
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
        padding: 30,
        color: "#64748B",
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}