"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  X,
  Trash2,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Server,
} from "lucide-react";

type Provider =
  | "smartlead"
  | "emailguard";

export type Integration = {
  id: string;
  provider: string;
  name: string;
  status: string | null;
  api_key_last4: string | null;
  last_synced_at: string | null;
  created_at: string;
};

type Props = {
  userId: string;
  initialIntegrations: Integration[];
};

export default function ConnectionsPageClient({
  initialIntegrations,
}: Props) {
  const supabase = createClient();

  const [
    integrations,
    setIntegrations,
  ] = useState<Integration[]>(
    initialIntegrations
  );

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    provider,
    setProvider,
  ] =
    useState<Provider>("smartlead");

  const [name, setName] =
    useState("");

  const [apiKey, setApiKey] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [syncingId, setSyncingId] =
    useState<string | null>(null);

  const smartleadConnections =
    useMemo(
      () =>
        integrations.filter(
          (item) =>
            item.provider ===
            "smartlead"
        ),
      [integrations]
    );

  const emailguardConnections =
    useMemo(
      () =>
        integrations.filter(
          (item) =>
            item.provider ===
            "emailguard"
        ),
      [integrations]
    );

  function openModal(
    selectedProvider: Provider
  ) {
    setProvider(
      selectedProvider
    );

    setName("");
    setApiKey("");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setName("");
    setApiKey("");
    setError("");
  }

  async function handleAddConnection() {
    if (!name.trim()) {
      setError(
        "Connection name is required."
      );
      return;
    }

    if (!apiKey.trim()) {
      setError(
        "API key is required."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/integrations",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              provider,
              name:
                name.trim(),
              apiKey:
                apiKey.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to add connection."
        );

        setSaving(false);
        return;
      }

      const newIntegration =
        result.integration as Integration;

      setIntegrations(
        (current) => [
          ...current,
          newIntegration,
        ]
      );

      setShowModal(false);
      setName("");
      setApiKey("");
      setError("");
    } catch {
      setError(
        "Unable to connect. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(
    integration: Integration
  ) {
    const confirmed =
      window.confirm(
        `Remove "${integration.name}" connection?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("integrations")
      .delete()
      .eq(
        "id",
        integration.id
      );

    if (deleteError) {
      alert(
        deleteError.message
      );
      return;
    }

    setIntegrations(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            integration.id
        )
    );
  }

async function handleSync(
  integration: Integration
) {
  if (
    syncingId ===
    integration.id
  ) {
    return;
  }

  setSyncingId(
    integration.id
  );

  try {
    const endpoint =
      integration.provider ===
      "emailguard"
        ? `/api/integrations/${integration.id}/emailguard-sync`
        : `/api/integrations/${integration.id}/sync`;

    const response =
      await fetch(
        endpoint,
        {
          method: "POST",
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      alert(
        result.error ||
          "Sync failed."
      );

      return;
    }

    setIntegrations(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            integration.id
              ? {
                  ...item,

                  status:
                    "connected",

                  last_synced_at:
                    result.lastSyncedAt,
                }
              : item
        )
    );

    if (
      integration.provider ===
      "emailguard"
    ) {
      alert(
        `EmailGuard sync completed

Domains: ${result.summary.domainsFetched}
Healthy: ${result.summary.healthy}
Need attention: ${result.summary.attention}`
      );
    } else {
      alert(
        `Smartlead sync completed

Accounts: ${result.summary.accountsFetched}
Campaigns: ${result.summary.campaigns}
Active campaigns: ${result.summary.activeCampaigns}`
      );
    }
  } catch {
    alert(
      "Unable to sync connection."
    );
  } finally {
    setSyncingId(null);
  }
}

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
          Connections
        </h1>

        <p
          style={{
            marginTop: 7,
            marginBottom: 0,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          Connect Smartlead and
          EmailGuard accounts to
          Outreach Ops.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Total Connections"
          value={
            integrations.length
          }
        />

        <SummaryCard
          title="Smartlead"
          value={
            smartleadConnections.length
          }
        />

        <SummaryCard
          title="EmailGuard"
          value={
            emailguardConnections.length
          }
        />
      </div>

      <ConnectionSection
        title="Smartlead"
        description="Connect one or more Smartlead accounts."
        count={
          smartleadConnections.length
        }
        onAdd={() =>
          openModal(
            "smartlead"
          )
        }
        connections={
          smartleadConnections
        }
        syncingId={
          syncingId
        }
        onSync={
          handleSync
        }
        onRemove={
          handleRemove
        }
      />

      <div
        style={{
          height: 20,
        }}
      />

      <ConnectionSection
        title="EmailGuard"
        description="Connect EmailGuard accounts for domain monitoring."
        count={
          emailguardConnections.length
        }
        onAdd={() =>
          openModal(
            "emailguard"
          )
        }
        connections={
          emailguardConnections
        }
        syncingId={
          syncingId
        }
        onSync={
          handleSync
        }
        onRemove={
          handleRemove
        }
      />

      {showModal && (
        <div
          onClick={
            closeModal
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.48)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 480,
              background:
                "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 22px 70px rgba(15, 23, 42, 0.20)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  Add{" "}
                  {provider ===
                  "smartlead"
                    ? "Smartlead"
                    : "EmailGuard"}
                </h2>

                <p
                  style={{
                    marginTop: 5,
                    marginBottom: 0,
                    color:
                      "#64748B",
                    fontSize: 13,
                  }}
                >
                  Your API key will
                  be encrypted before
                  it is stored.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                style={{
                  marginLeft:
                    "auto",
                  width: 34,
                  height: 34,
                  border:
                    "1px solid #E5E7EB",
                  borderRadius: 8,
                  background:
                    "#FFFFFF",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor:
                    "pointer",
                }}
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <label
              style={
                labelStyle
              }
            >
              Connection Name
            </label>

            <input
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder={
                provider ===
                "smartlead"
                  ? "Example: Smartlead Main"
                  : "Example: EmailGuard Main"
              }
              style={
                fieldStyle
              }
            />

            <label
              style={
                labelStyle
              }
            >
              API Key
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <KeyRound
                size={16}
                color="#94A3B8"
                style={{
                  position:
                    "absolute",
                  left: 12,
                  top: 14,
                }}
              />

              <input
                type="password"
                value={apiKey}
                onChange={(
                  event
                ) =>
                  setApiKey(
                    event.target
                      .value
                  )
                }
                placeholder="Paste API key"
                autoComplete="off"
                style={{
                  ...fieldStyle,
                  paddingLeft: 38,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  color:
                    "#B91C1C",
                  padding: 11,
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                style={{
                  flex: 1,
                  height: 44,
                  border:
                    "1px solid #D1D5DB",
                  borderRadius: 9,
                  background:
                    "#FFFFFF",
                  color:
                    "#111827",
                  cursor:
                    "pointer",
                  fontWeight: 650,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleAddConnection
                }
                disabled={
                  saving
                }
                style={{
                  flex: 1,
                  height: 44,
                  border: 0,
                  borderRadius: 9,
                  background:
                    "#111827",
                  color:
                    "#FFFFFF",
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 650,
                  opacity:
                    saving
                      ? 0.7
                      : 1,
                }}
              >
                {saving
                  ? "Connecting..."
                  : "Add Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionSection({
  title,
  description,
  count,
  onAdd,
  connections,
  syncingId,
  onSync,
  onRemove,
}: {
  title: string;
  description: string;
  count: number;
  onAdd: () => void;
  connections: Integration[];
  syncingId: string | null;
  onSync: (
    integration: Integration
  ) => void;
  onRemove: (
    integration: Integration
  ) => void;
}) {
  return (
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
          padding: 20,
          borderBottom:
            "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background:
              "#F1F5F9",
            display: "flex",
            alignItems:
              "center",
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

        <div>
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              {title}
            </div>

            <span
              style={{
                background:
                  "#F1F5F9",
                color:
                  "#475569",
                padding:
                  "4px 7px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {count}
            </span>
          </div>

          <div
            style={{
              color:
                "#64748B",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {description}
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          style={{
            marginLeft:
              "auto",
            height: 38,
            border: 0,
            borderRadius: 8,
            background:
              "#111827",
            color:
              "#FFFFFF",
            display: "flex",
            alignItems:
              "center",
            gap: 6,
            padding:
              "0 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {connections.length ===
      0 ? (
        <div
          style={{
            padding: 32,
            textAlign:
              "center",
            color:
              "#64748B",
            fontSize: 13,
          }}
        >
          No {title} connections yet.
        </div>
      ) : (
        <div>
          {connections.map(
            (integration) => (
              <div
                key={
                  integration.id
                }
                style={{
                  padding:
                    "16px 20px",
                  display: "flex",
                  alignItems:
                    "center",
                  borderTop:
                    "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius:
                      "50%",
                    background:
                      integration.status ===
                      "connected"
                        ? "#10B981"
                        : "#F59E0B",
                    marginRight: 12,
                  }}
                />

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        "#111827",
                    }}
                  >
                    {
                      integration.name
                    }
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 12,
                      marginTop: 5,
                      color:
                        "#64748B",
                      fontSize: 11,
                    }}
                  >
                    <span>
                      Key ••••
                      {integration.api_key_last4 ||
                        "****"}
                    </span>

                    <span>
                      Last sync{" "}
                      {formatLastSync(
                        integration.last_synced_at
                      )}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginLeft:
                      "auto",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      background:
                        "#ECFDF5",
                      color:
                        "#047857",
                      padding:
                        "6px 8px",
                      borderRadius: 7,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 5,
                    }}
                  >
                    <CheckCircle2
                      size={13}
                    />
                    Connected
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onSync(
                        integration
                      )
                    }
                    disabled={
                      syncingId ===
                      integration.id
                    }
                    style={
                      actionButtonStyle
                    }
                  >
                    <RefreshCw
                      size={14}
                      style={{
                        animation:
                          syncingId ===
                          integration.id
                            ? "spin 0.8s linear infinite"
                            : "none",
                      }}
                    />

                    {syncingId ===
                    integration.id
                      ? "Syncing"
                      : "Sync"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onRemove(
                        integration
                      )
                    }
                    style={{
                      ...actionButtonStyle,
                      color:
                        "#B91C1C",
                      border:
                        "1px solid #FECACA",
                    }}
                  >
                    <Trash2
                      size={14}
                    />
                    Remove
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
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
          color:
            "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  height: 44,
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
  marginBottom: 16,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color:
    "#374151",
  marginBottom: 7,
};

const actionButtonStyle = {
  height: 34,
  border:
    "1px solid #D1D5DB",
  borderRadius: 8,
  background:
    "#FFFFFF",
  color:
    "#334155",
  display: "flex",
  alignItems:
    "center",
  gap: 5,
  padding:
    "0 9px",
  cursor:
    "pointer",
  fontSize: 10,
  fontWeight: 700,
};

function formatLastSync(
  value: string | null
) {
  if (!value) {
    return "Never";
  }

  return new Date(
    value
  ).toLocaleString();
}