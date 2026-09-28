import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function DashboardShell() {
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
            Today at 8:04 AM
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
          value="3,648"
          text="Across 2 Smartlead accounts"
        />

        <StatCard
          title="Healthy"
          value="3,520"
          text="96.5% accounts healthy"
        />

        <StatCard
          title="Need Attention"
          value="128"
          text="Settings or connection issues"
          warning
        />

        <StatCard
          title="Active Campaigns"
          value="24"
          text="Across all connections"
        />

        <StatCard
          title="Domains"
          value="158"
          text="Across 3 EmailGuard accounts"
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
                color: "#2563EB",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                marginLeft: "auto",
              }}
            >
              Manage
            </Link>
          </div>

          <ConnectionRow
            name="Smartlead Main"
            accounts="3,098 accounts"
            campaigns="10 active campaigns"
          />

          <ConnectionRow
            name="Smartlead 2"
            accounts="550 accounts"
            campaigns="14 active campaigns"
          />
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
                Today&apos;s Updat
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
              Today at 8:04 AM
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
              value="3,648"
            />

            <UpdateRow
              label="Active campaigns checked"
              value="24"
            />

            <UpdateRow
              label="Domains checked"
              value="158"
            />

            <UpdateRow
              label="New issues found"
              value="12"
              warning
            />

            <UpdateRow
              label="Issues resolved"
              value="7"
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
                display: "inline-flex",
                alignItems: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "#2563EB",
                textDecoration: "none",
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
            }}
          >
            Account Health
          </h2>

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
              value="3,520"
            />

            <HealthBox
              title="Wrong Daily Limit"
              value="42"
              warning
            />

            <HealthBox
              title="Warmup Issues"
              value="31"
              warning
            />

            <HealthBox
              title="Connection Issues"
              value="8"
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
                }}
              >
                Recent Issues
              </h2>

              <p
                style={{
                  color: "#6B7280",
                  fontSize: 13,
                  marginTop: 5,
                }}
              >
                Items that need attention
              </p>
            </div>

            <Link
              href="/issues"
              style={{
                color: "#2563EB",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
                marginLeft: "auto",
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
            <IssueRow
              title="Daily limit incorrect"
              detail="john@example.com"
            />

            <IssueRow
              title="Warmup disabled"
              detail="sales@example.com"
            />

            <IssueRow
              title="DMARC issue detected"
              detail="example.com"
            />
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
          color: "#047857",
          background: "#ECFDF5",
          padding: "6px 9px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          marginLeft: "auto",
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
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
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
          color: warning ? "#B45309" : "#111827",
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
      <CircleAlert size={17} color="#B45309" />

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