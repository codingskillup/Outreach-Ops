"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Plug,
  X,
  Loader2,
} from "lucide-react";

type Integration = {
  id: string;
  user_id: string;
  provider: string;
  name: string;
  api_key: string;
  status: string;
  last_synced_at: string | null;
  created_at: string;
};

type SmartleadTestResult = {
  success: boolean;
  message?: string;
  campaignCount?: number;
  activeCampaignCount?: number;
};

export default function ConnectionsPageClient({
  userId,
  initialIntegrations,
}: {
  userId: string;
  initialIntegrations: Integration[];
}) {
  const supabase = createClient();

  const [integrations, setIntegrations] =
    useState<Integration[]>(
      initialIntegrations
    );

  const [showModal, setShowModal] =
    useState(false);

  const [provider, setProvider] =
    useState<
      "smartlead" | "emailguard"
    >("smartlead");

  const [name, setName] =
    useState("");

  const [apiKey, setApiKey] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [testing, setTesting] =
    useState(false);

  const [error, setError] =
    useState("");

  const smartleadConnections =
    integrations.filter(
      (item) =>
        item.provider === "smartlead"
    );

  const emailguardConnections =
    integrations.filter(
      (item) =>
        item.provider === "emailguard"
    );

  function openModal(
    type:
      | "smartlead"
      | "emailguard"
  ) {
    setProvider(type);

    setName("");
    setApiKey("");
    setError("");

    setShowModal(true);
  }

  function closeModal() {
    if (saving || testing) {
      return;
    }

    setShowModal(false);

    setName("");
    setApiKey("");
    setError("");
  }

  async function testSmartleadConnection() {
    const response =
      await fetch(
        "/api/smartlead/test",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            apiKey: apiKey.trim(),
          }),
        }
      );

    const result:
      SmartleadTestResult =
        await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
          "Smartlead connection could not be verified."
      );
    }

    return result;
  }

  async function handleConnect() {
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

    setError("");

    if (
      provider === "smartlead"
    ) {
      setTesting(true);

      try {
        await testSmartleadConnection();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not connect to Smartlead.";

        setError(message);

        setTesting(false);

        return;
      }

      setTesting(false);
    }

    setSaving(true);

    const {
      data,
      error: insertError,
    } = await supabase
      .from("integrations")
      .insert({
        user_id: userId,
        provider,
        name: name.trim(),
        api_key: apiKey.trim(),
        status: "connected",
      })
      .select()
      .single();

    if (insertError) {
      setError(
        insertError.message
      );

      setSaving(false);

      return;
    }

    setIntegrations(
      (current) => [
        ...current,
        data,
      ]
    );

    setSaving(false);

    setShowModal(false);

    setName("");
    setApiKey("");
    setError("");
  }

  async function handleRemove(
    id: string,
    connectionName: string
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to remove ${connectionName}?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("integrations")
      .delete()
      .eq("id", id);

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
            item.id !== id
        )
    );
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
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 750,
            color: "#111827",
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
          Connect and manage
          your Smartlead and
          EmailGuard accounts.
        </p>
      </div>

      <section
        style={{
          background: "#FFFFFF",
          border:
            "1px solid #E5E7EB",
          borderRadius: 14,
          padding: 22,
          marginBottom: 22,
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
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Smartlead
            </h2>

            <p
              style={{
                color: "#6B7280",
                fontSize: 13,
                marginTop: 5,
                marginBottom: 0,
              }}
            >
              {
                smartleadConnections.length
              }{" "}
              connected
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              openModal(
                "smartlead"
              )
            }
            style={{
              marginLeft: "auto",
              border: 0,
              borderRadius: 9,
              padding:
                "10px 14px",
              background:
                "#111827",
              color: "#FFFFFF",
              display: "flex",
              alignItems:
                "center",
              gap: 7,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Plus size={16} />

            Connect Smartlead
          </button>
        </div>

        {smartleadConnections.length ===
        0 ? (
          <EmptyConnection
            text="No Smartlead accounts connected yet."
          />
        ) : (
          <div>
            {smartleadConnections.map(
              (item) => (
                <ConnectionCard
                  key={item.id}
                  integration={
                    item
                  }
                  onRemove={
                    handleRemove
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <section
        style={{
          background: "#FFFFFF",
          border:
            "1px solid #E5E7EB",
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
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              EmailGuard
            </h2>

            <p
              style={{
                color: "#6B7280",
                fontSize: 13,
                marginTop: 5,
                marginBottom: 0,
              }}
            >
              {
                emailguardConnections.length
              }{" "}
              connected
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              openModal(
                "emailguard"
              )
            }
            style={{
              marginLeft: "auto",
              border: 0,
              borderRadius: 9,
              padding:
                "10px 14px",
              background:
                "#111827",
              color: "#FFFFFF",
              display: "flex",
              alignItems:
                "center",
              gap: 7,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Plus size={16} />

            Connect EmailGuard
          </button>
        </div>

        {emailguardConnections.length ===
        0 ? (
          <EmptyConnection
            text="No EmailGuard accounts connected yet."
          />
        ) : (
          <div>
            {emailguardConnections.map(
              (item) => (
                <ConnectionCard
                  key={item.id}
                  integration={
                    item
                  }
                  onRemove={
                    handleRemove
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
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
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 460,
              background:
                "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.18)",
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
                    color:
                      "#111827",
                  }}
                >
                  Connect{" "}
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
                      "#6B7280",
                    fontSize: 13,
                  }}
                >
                  Add the account
                  details below.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving ||
                  testing
                }
                style={{
                  marginLeft:
                    "auto",
                  border: 0,
                  background:
                    "transparent",
                  cursor:
                    saving ||
                    testing
                      ? "not-allowed"
                      : "pointer",
                  color:
                    "#64748B",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <label
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 7,
                color: "#374151",
              }}
            >
              Connection Name
            </label>

            <input
              value={name}
              disabled={
                saving ||
                testing
              }
              onChange={(event) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder={
                provider ===
                "smartlead"
                  ? "Smartlead Main"
                  : "EmailGuard Main"
              }
              style={{
                width: "100%",
                height: 46,
                border:
                  "1px solid #D1D5DB",
                borderRadius: 9,
                padding:
                  "0 12px",
                boxSizing:
                  "border-box",
                marginBottom: 16,
                outline: "none",
                fontSize: 14,
                color:
                  "#111827",
                background:
                  "#FFFFFF",
              }}
            />

            <label
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 7,
                color: "#374151",
              }}
            >
              API Key
            </label>

            <input
              type="password"
              value={apiKey}
              disabled={
                saving ||
                testing
              }
              onChange={(event) =>
                setApiKey(
                  event.target
                    .value
                )
              }
              placeholder="Enter API key"
              style={{
                width: "100%",
                height: 46,
                border:
                  "1px solid #D1D5DB",
                borderRadius: 9,
                padding:
                  "0 12px",
                boxSizing:
                  "border-box",
                outline: "none",
                fontSize: 14,
                color:
                  "#111827",
                background:
                  "#FFFFFF",
              }}
            />

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#94A3B8",
                fontSize: 12,
              }}
            >
              {provider ===
              "smartlead"
                ? "The Smartlead API key will be tested before saving."
                : "Your API key will be used for this connection."}
            </p>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: 11,
                  borderRadius: 8,
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  color:
                    "#B91C1C",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving ||
                  testing
                }
                style={{
                  flex: 1,
                  height: 46,
                  border:
                    "1px solid #D1D5DB",
                  borderRadius: 9,
                  background:
                    "#FFFFFF",
                  color:
                    "#374151",
                  fontWeight: 600,
                  cursor:
                    saving ||
                    testing
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleConnect
                }
                disabled={
                  saving ||
                  testing
                }
                style={{
                  flex: 1,
                  height: 46,
                  border: 0,
                  borderRadius: 9,
                  background:
                    "#111827",
                  color:
                    "#FFFFFF",
                  fontWeight: 650,
                  cursor:
                    saving ||
                    testing
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving ||
                    testing
                      ? 0.7
                      : 1,
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: 8,
                }}
              >
                {testing && (
                  <Loader2
                    size={16}
                    style={{
                      animation:
                        "spin 1s linear infinite",
                    }}
                  />
                )}

                {testing
                  ? "Testing..."
                  : saving
                    ? "Saving..."
                    : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(
              0deg
            );
          }

          to {
            transform: rotate(
              360deg
            );
          }
        }
      `}</style>
    </div>
  );
}

function EmptyConnection({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        minHeight: 120,
        border:
          "1px dashed #CBD5E1",
        borderRadius: 11,
        padding: 26,
        color: "#6B7280",
        fontSize: 14,
        display: "flex",
        flexDirection:
          "column",
        alignItems: "center",
        justifyContent:
          "center",
      }}
    >
      <Plug
        size={23}
        style={{
          marginBottom: 9,
          color: "#64748B",
        }}
      />

      <div>{text}</div>
    </div>
  );
}

function ConnectionCard({
  integration,
  onRemove,
}: {
  integration: Integration;

  onRemove: (
    id: string,
    connectionName: string
  ) => void;
}) {
  const lastSync =
    integration.last_synced_at
      ? new Date(
          integration.last_synced_at
        ).toLocaleString()
      : "Not synced yet";

  return (
    <div
      style={{
        border:
          "1px solid #E5E7EB",
        borderRadius: 11,
        padding: 16,
        marginBottom: 11,
        display: "flex",
        alignItems: "center",
        gap: 16,
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
          color: "#0F172A",
        }}
      >
        <Plug size={19} />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 650,
            fontSize: 14,
          }}
        >
          {integration.name}

          <CheckCircle2
            size={16}
            color="#059669"
          />
        </div>

        <div
          style={{
            color: "#6B7280",
            fontSize: 12,
            marginTop: 5,
          }}
        >
          {integration.provider ===
          "smartlead"
            ? "Smartlead"
            : "EmailGuard"}
        </div>

        <div
          style={{
            color: "#94A3B8",
            fontSize: 11,
            marginTop: 4,
          }}
        >
          Last sync:{" "}
          {lastSync}
        </div>
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            background: "#ECFDF5",
            color: "#047857",
            borderRadius: 8,
            padding:
              "7px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Connected
        </span>

        <button
          type="button"
          style={{
            height: 36,
            border:
              "1px solid #D1D5DB",
            borderRadius: 8,
            padding:
              "0 11px",
            background:
              "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems:
              "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <RefreshCw
            size={14}
          />

          Sync
        </button>

        <button
          type="button"
          onClick={() =>
            onRemove(
              integration.id,
              integration.name
            )
          }
          style={{
            height: 36,
            border:
              "1px solid #FECACA",
            borderRadius: 8,
            padding:
              "0 11px",
            background:
              "#FFFFFF",
            color: "#B91C1C",
            cursor: "pointer",
            display: "flex",
            alignItems:
              "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Trash2 size={14} />

          Remove
        </button>
      </div>
    </div>
  );
}