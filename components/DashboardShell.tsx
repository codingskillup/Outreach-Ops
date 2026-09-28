import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { demoDashboardData } from "@/lib/demoData";

export default function DashboardShell() {
  const data = demoDashboardData;

  const healthPercentage =
    data.summary.emailAccounts > 0
      ? (
          (data.summary.healthyAccounts /
            data.summary.emailAccounts) *
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
          display: "flex",
          alignItems: "center",
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 27,
              fontWeight: 750,
            }}
          >
            Good morning
          </h1>

          <p
            style={{
              color: "#6B7280",
              marginTop: 7,
              marginBottom: 0,
              fontSize: 14,
            }}
          >
            Here is the latest status of your outreach infrastructure.
          </p>
        </div>

        <div
          style={{
            textAlign: "right",
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
            }}
          >
            Last daily check
          </div>

          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              marginTop: 4,
            }}
          >
            Today at {data.todaysUpdate.checkedAt}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Email Accounts"
          value={data.summary.emailAccounts.toLocaleString()}
          text={`${data.smartleadConnections.length} Smartlead connections`}
        />

        <StatCard
          title="Healthy"
          value={data.summary.healthyAccounts.toLocaleString()}
          text={`${healthPercentage}% accounts healthy`}
        />

        <StatCard
          title="Need Attention"
          value={data.summary.needAttention.toLocaleString()}
          text="Settings or connection issues"
          warning
        />

        <StatCard
          title="Active Campaigns"
          value={data.summary.activeCampaigns.toLocaleString()}
          text="Across all Smartlead connections"
        />

        <StatCard
          title="Domains"
          value={data.summary.domains.toLocaleString()}
          text="Across EmailGuard connections"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 20,
        }}
      >
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                Smartlead Connections
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 13,
                  color: "#6B7280",
                }}
              >
                Current account status
              </p>
            </div>

            <Link
              href="/connections"
              style={{
                marginLeft: "auto",
                color: "#2563EB",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Manage
            </Link>
          </div>

          {data.smartleadConnections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              name={connection.name}
              accounts={`${connection.accounts.toLocaleString()} accounts`}
              campaigns={`${connection.activeCampaigns} active campaigns`}
            />
          ))}
        </section>

        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                Today&apos;s Update

              </h2>

              <p
                style={{
                  marginTop: 5,
                  marginBottom: 0,
                  color: "#6B7280",
                  fontSize: 13,
                }}
              >
                Latest daily infrastructure check
              </p>
            </div>

            <div
              style={{
                marginLeft: "auto",
                background: "#ECFDF5",
                color: "#047857",
                padding: "6px 9px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Completed
            </div>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E5E7EB",
              borderRadius: 11,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                color: "#64748B",
                fontSize: 12,
              }}
            >
              Daily check
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 14,
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Today at {data.todaysUpdate.checkedAt}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <UpdateRow
              label="Email accounts checked"
              value={data.todaysUpdate.emailAccountsChecked.toLocaleString()}
            />

            <UpdateRow
              label="Active campaigns checked"
              value={data.todaysUpdate.activeCampaignsChecked.toLocaleString()}
            />

            <UpdateRow
              label="Domains checked"
              value={data.todaysUpdate.domainsChecked.toLocaleString()}
            />

            <UpdateRow
              label="New issues found"
              value={data.todaysUpdate.newIssues.toLocaleString()}
              warning
            />

            <UpdateRow
              label="Issues resolved"
              value={data.todaysUpdate.resolvedIssues.toLocaleString()}
              success
            />
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid #E5E7EB",
            }}
          >
            <Link
              href="/activity"
              style={{
                color: "#2563EB",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              View daily activity
            </Link>
          </div>
        </section>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 20,
        }}
      >
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Account Health
          </h2>

          <p
            style={{
              marginTop: 5,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Smartlead account configuration status
          </p>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <HealthBox
              title="Correct Settings"
              value={data.accountHealth.correctSettings.toLocaleString()}
              success
            />

            <HealthBox
              title="Wrong Daily Limit"
              value={data.accountHealth.wrongDailyLimit.toLocaleString()}
              warning
            />

            <HealthBox
              title="Warmup Issues"
              value={data.accountHealth.warmupIssues.toLocaleString()}
              warning
            />

            <HealthBox
              title="Connection Issues"
              value={data.accountHealth.connectionIssues.toLocaleString()}
              warning
            />
          </div>
        </section>

        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                Recent Issues
              </h2>

              <p
                style={{
                  color: "#6B7280",
                  fontSize: 13,
                  marginTop: 5,
                  marginBottom: 0,
                }}
              >
                Items that need attention
              </p>
            </div>

            <Link
              href="/issues"
              style={{
                marginLeft: "auto",
                color: "#2563EB",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              View all
            </Link>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {data.recentIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                title={issue.title}
                detail={issue.detail}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  text,
  warning,
}: {
  title: string;
  value: string;
  text: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          color: "#6B7280",
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 750,
          color: warning ? "#B45309" : "#111827",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#9CA3AF",
          marginTop: 8,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ConnectionRow({
  name,
  accounts,
  campaigns,
}: {
  name: string;
  accounts: string;
  campaigns: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 11,
        padding: 15,
        marginBottom: 11,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 650,
            fontSize: 14,
          }}
        >
          {name}
        </div>

        <div
          style={{
            marginTop: 5,
            color: "#6B7280",
            fontSize: 12,
          }}
        >
          {accounts} · {campaigns}
        </div>
      </div>

      <div
        style={{
          marginLeft: "auto",
          color: "#047857",
          background: "#ECFDF5",
          padding: "6px 9px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Connected
      </div>
    </div>
  );
}

function UpdateRow({
  label,
  value,
  warning,
  success,
}: {
  label: string;
  value: string;
  warning?: boolean;
  success?: boolean;
}) {
  let valueColor = "#111827";

  if (warning) {
    valueColor = "#B45309";
  }

  if (success) {
    valueColor = "#047857";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 36,
      }}
    >
      <span
        style={{
          color: "#64748B",
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <span
        style={{
          marginLeft: "auto",
          fontWeight: 700,
          fontSize: 14,
          color: valueColor,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function HealthBox({
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
  let valueColor = "#111827";

  if (warning) {
    valueColor = "#B45309";
  }

  if (success) {
    valueColor = "#047857";
  }

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          color: "#6B7280",
          fontSize: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          fontWeight: 750,
          fontSize: 20,
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function IssueRow({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        border: "1px solid #F3F4F6",
        padding: 12,
        borderRadius: 10,
      }}
    >
      <CircleAlert
        size={17}
        color="#B45309"
      />

      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#6B7280",
            marginTop: 3,
            fontSize: 12,
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}