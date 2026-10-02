"use client";

import {
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Mail,
  Plus,
  Trash2,
  Bell,
  Clock3,
  Power,
  X,
  Send,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

type Recipient = {
  id: string;
  email: string;
  instant_issue_alert: boolean;
  daily_report: boolean;
  is_active: boolean;
  created_at:
    | string
    | null;
};

export default function NotificationSettingsClient({
  userId,
  initialRecipients,
}: {
  userId: string;
  initialRecipients: Recipient[];
}) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    recipients,
    setRecipients,
  ] =
    useState<Recipient[]>(
      initialRecipients
    );

  const [
    showModal,
    setShowModal,
  ] =
    useState(false);

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    instantIssueAlert,
    setInstantIssueAlert,
  ] =
    useState(true);

  const [
    dailyReport,
    setDailyReport,
  ] =
    useState(true);

  const [
    isActive,
    setIsActive,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    testingRecipientId,
    setTestingRecipientId,
  ] =
    useState<
      string | null
    >(null);

  function openModal() {
    setEmail("");

    setInstantIssueAlert(
      true
    );

    setDailyReport(
      true
    );

    setIsActive(
      true
    );

    setError(
      null
    );

    setShowModal(
      true
    );
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(
      false
    );

    setError(
      null
    );
  }

  async function addRecipient() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter an email address."
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    if (
      !instantIssueAlert &&
      !dailyReport
    ) {
      setError(
        "Please select at least one notification type."
      );

      return;
    }

    setSaving(
      true
    );

    setError(
      null
    );

    const {
      data,
      error:
        insertError,
    } =
      await supabase
        .from(
          "notification_recipients"
        )
        .insert({
          user_id:
            userId,

          email:
            cleanEmail,

          instant_issue_alert:
            instantIssueAlert,

          daily_report:
            dailyReport,

          is_active:
            isActive,
        })
        .select(`
          id,
          email,
          instant_issue_alert,
          daily_report,
          is_active,
          created_at
        `)
        .single();

    setSaving(
      false
    );

    if (
      insertError
    ) {
      if (
        insertError.code ===
        "23505"
      ) {
        setError(
          "This email is already added."
        );
      } else {
        setError(
          insertError.message
        );
      }

      return;
    }

    if (!data) {
      setError(
        "Recipient could not be added."
      );

      return;
    }

    setRecipients(
      (
        current
      ) => [
        ...current,
        data as Recipient,
      ]
    );

    setShowModal(
      false
    );

    setEmail("");

    router.refresh();
  }

  async function updateRecipient(
    id: string,
    values:
      Partial<
        Pick<
          Recipient,
          | "instant_issue_alert"
          | "daily_report"
          | "is_active"
        >
      >
  ) {
    setError(
      null
    );

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "notification_recipients"
        )
        .update({
          ...values,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          userId
        );

    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      return;
    }

    setRecipients(
      (
        current
      ) =>
        current.map(
          (
            recipient
          ) =>
            recipient.id ===
            id
              ? {
                  ...recipient,
                  ...values,
                }
              : recipient
        )
    );
  }

  async function removeRecipient(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Remove this email recipient?"
      );

    if (!confirmed) {
      return;
    }

    setError(
      null
    );

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "notification_recipients"
        )
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          userId
        );

    if (
      deleteError
    ) {
      setError(
        deleteError.message
      );

      return;
    }

    setRecipients(
      (
        current
      ) =>
        current.filter(
          (
            recipient
          ) =>
            recipient.id !==
            id
        )
    );
  }

  async function testRecipient(
    recipient: Recipient
  ) {
    setTestingRecipientId(
      recipient.id
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/email/test-recipient",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recipientId:
                  recipient.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setError(
          result.error ||
            "Test email failed."
        );

        return;
      }

      window.alert(
        `Test email sent to ${recipient.email}`
      );
    } catch (
      error
    ) {
      console.error(
        "Test email error:",
        error
      );

      setError(
        "Unable to send test email."
      );
    } finally {
      setTestingRecipientId(
        null
      );
    }
  }

  return (
    <>
      <div
        style={{
          width:
            "100%",
        }}
      >
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              20,

            marginBottom:
              28,
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  0,

                fontSize:
                  22,

                fontWeight:
                  700,

                color:
                  "#111827",
              }}
            >
              Email Notifications
            </h2>

            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#6b7280",

                fontSize:
                  14,
              }}
            >
              Choose who receives new issue alerts and the daily 8 AM report.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openModal
            }
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                8,

              border:
                "none",

              background:
                "#111827",

              color:
                "#ffffff",

              padding:
                "11px 16px",

              borderRadius:
                9,

              fontWeight:
                650,

              cursor:
                "pointer",

              whiteSpace:
                "nowrap",
            }}
          >
            <Plus
              size={
                17
              }
            />

            Add Recipient
          </button>
        </div>

        {error &&
          !showModal && (
            <div
              style={{
                padding:
                  "12px 14px",

                background:
                  "#fef2f2",

                border:
                  "1px solid #fecaca",

                color:
                  "#b91c1c",

                borderRadius:
                  9,

                marginBottom:
                  16,

                fontSize:
                  13,
              }}
            >
              {error}
            </div>
          )}

        <div
          style={{
            display:
              "grid",

            gap:
              12,
          }}
        >
          {recipients.length ===
            0 && (
            <div
              style={{
                padding:
                  45,

                textAlign:
                  "center",

                background:
                  "#ffffff",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  12,

                color:
                  "#6b7280",
              }}
            >
              No notification emails added yet.
            </div>
          )}

          {recipients.map(
            (
              recipient
            ) => (
              <div
                key={
                  recipient.id
                }
                style={{
                  background:
                    "#ffffff",

                  border:
                    "1px solid #e5e7eb",

                  borderRadius:
                    12,

                  padding:
                    "18px",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  flexWrap:
                    "wrap",

                  gap:
                    18,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      10,

                    minWidth:
                      250,

                    flex:
                      "1 1 300px",
                  }}
                >
                  <Mail
                    size={
                      18
                    }
                    style={{
                      color:
                        "#64748b",
                    }}
                  />

                  <strong
                    style={{
                      color:
                        "#111827",

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {
                      recipient.email
                    }
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    flexWrap:
                      "wrap",

                    gap:
                      16,
                  }}
                >
                  <SettingToggle
                    icon={
                      <Bell
                        size={
                          16
                        }
                      />
                    }
                    label="New Issue Alert"
                    checked={
                      recipient
                        .instant_issue_alert
                    }
                    onChange={(
                      checked
                    ) =>
                      updateRecipient(
                        recipient.id,
                        {
                          instant_issue_alert:
                            checked,
                        }
                      )
                    }
                  />

                  <SettingToggle
                    icon={
                      <Clock3
                        size={
                          16
                        }
                      />
                    }
                    label="Daily 8 AM"
                    checked={
                      recipient
                        .daily_report
                    }
                    onChange={(
                      checked
                    ) =>
                      updateRecipient(
                        recipient.id,
                        {
                          daily_report:
                            checked,
                        }
                      )
                    }
                  />

                  <SettingToggle
                    icon={
                      <Power
                        size={
                          16
                        }
                      />
                    }
                    label="Active"
                    checked={
                      recipient
                        .is_active
                    }
                    onChange={(
                      checked
                    ) =>
                      updateRecipient(
                        recipient.id,
                        {
                          is_active:
                            checked,
                        }
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      testRecipient(
                        recipient
                      )
                    }
                    disabled={
                      testingRecipientId ===
                      recipient.id
                    }
                    title="Send test email"
                    style={{
                      height:
                        40,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      gap:
                        7,

                      padding:
                        "0 12px",

                      border:
                        "1px solid #dbeafe",

                      background:
                        "#eff6ff",

                      color:
                        "#2563eb",

                      borderRadius:
                        8,

                      fontSize:
                        13,

                      fontWeight:
                        600,

                      cursor:
                        testingRecipientId ===
                        recipient.id
                          ? "not-allowed"
                          : "pointer",

                      opacity:
                        testingRecipientId ===
                        recipient.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    <Send
                      size={
                        15
                      }
                    />

                    {testingRecipientId ===
                    recipient.id
                      ? "Sending..."
                      : "Test"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeRecipient(
                        recipient.id
                      )
                    }
                    title="Remove recipient"
                    style={{
                      width:
                        40,

                      height:
                        40,

                      display:
                        "grid",

                      placeItems:
                        "center",

                      border:
                        "1px solid #fecaca",

                      background:
                        "#ffffff",

                      color:
                        "#dc2626",

                      borderRadius:
                        8,

                      cursor:
                        "pointer",
                    }}
                  >
                    <Trash2
                      size={
                        16
                      }
                    />
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            marginTop:
              24,

            padding:
              16,

            background:
              "#f9fafb",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              10,

            color:
              "#6b7280",

            fontSize:
              13,

            lineHeight:
              1.7,
          }}
        >
          <strong
            style={{
              color:
                "#111827",
            }}
          >
            New Issue Alert:
          </strong>{" "}
          Sends an email when Outreach Ops detects a new issue.

          <br />

          <strong
            style={{
              color:
                "#111827",
            }}
          >
            Daily 8 AM:
          </strong>{" "}
          Sends the daily Smartlead, EmailGuard and issue summary.

          <br />

          <strong
            style={{
              color:
                "#111827",
            }}
          >
            Active:
          </strong>{" "}
          Turns all notifications for this recipient on or off.
        </div>
      </div>

      {showModal && (
        <div
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
          style={{
            position:
              "fixed",

            inset:
              0,

            background:
              "rgba(15, 23, 42, 0.48)",

            display:
              "grid",

            placeItems:
              "center",

            zIndex:
              1000,

            padding:
              20,
          }}
        >
          <div
            style={{
              width:
                "100%",

              maxWidth:
                520,

              background:
                "#ffffff",

              borderRadius:
                14,

              boxShadow:
                "0 20px 50px rgba(0,0,0,0.20)",

              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap:
                  20,

                padding:
                  "20px 22px",

                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <div>
                <h3
                  style={{
                    margin:
                      0,

                    fontSize:
                      19,

                    color:
                      "#111827",
                  }}
                >
                  Add Email Recipient
                </h3>

                <p
                  style={{
                    margin:
                      "5px 0 0",

                    color:
                      "#6b7280",

                    fontSize:
                      13,
                  }}
                >
                  Choose which notifications this email should receive.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                title="Close"
                style={{
                  width:
                    36,

                  height:
                    36,

                  display:
                    "grid",

                  placeItems:
                    "center",

                  border:
                    "none",

                  background:
                    "transparent",

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  color:
                    "#6b7280",
                }}
              >
                <X
                  size={
                    20
                  }
                />
              </button>
            </div>

            <div
              style={{
                padding:
                  22,
              }}
            >
              <label
                htmlFor="notification-email"
                style={{
                  display:
                    "block",

                  fontSize:
                    13,

                  fontWeight:
                    650,

                  marginBottom:
                    7,

                  color:
                    "#374151",
                }}
              >
                Email Address
              </label>

              <input
                id="notification-email"
                autoFocus
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event
                      .target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    addRecipient();
                  }
                }}
                placeholder="name@example.com"
                style={{
                  width:
                    "100%",

                  boxSizing:
                    "border-box",

                  border:
                    "1px solid #d1d5db",

                  borderRadius:
                    8,

                  padding:
                    "11px 12px",

                  outline:
                    "none",

                  fontSize:
                    14,

                  marginBottom:
                    22,

                  color:
                    "#111827",

                  background:
                    "#ffffff",
                }}
              />

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    12,
                }}
              >
                <ModalOption
                  icon={
                    <Bell
                      size={
                        18
                      }
                    />
                  }
                  title="New Issue Alerts"
                  description="Send an email when a new account or domain issue is detected."
                  checked={
                    instantIssueAlert
                  }
                  onChange={
                    setInstantIssueAlert
                  }
                />

                <ModalOption
                  icon={
                    <Clock3
                      size={
                        18
                      }
                    />
                  }
                  title="Daily 8 AM Report"
                  description="Receive the daily account, campaign, domain and issue summary."
                  checked={
                    dailyReport
                  }
                  onChange={
                    setDailyReport
                  }
                />

                <ModalOption
                  icon={
                    <Power
                      size={
                        18
                      }
                    />
                  }
                  title="Active Recipient"
                  description="Enable notifications for this email address."
                  checked={
                    isActive
                  }
                  onChange={
                    setIsActive
                  }
                />
              </div>

              {error && (
                <div
                  style={{
                    marginTop:
                      16,

                    padding:
                      "11px 12px",

                    borderRadius:
                      8,

                    background:
                      "#fef2f2",

                    color:
                      "#b91c1c",

                    border:
                      "1px solid #fecaca",

                    fontSize:
                      13,
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  10,

                padding:
                  "16px 22px",

                borderTop:
                  "1px solid #e5e7eb",

                background:
                  "#f9fafb",
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
                  border:
                    "1px solid #d1d5db",

                  background:
                    "#ffffff",

                  color:
                    "#374151",

                  borderRadius:
                    8,

                  padding:
                    "10px 15px",

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    600,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  addRecipient
                }
                disabled={
                  saving
                }
                style={{
                  border:
                    "none",

                  background:
                    "#111827",

                  color:
                    "#ffffff",

                  borderRadius:
                    8,

                  padding:
                    "10px 16px",

                  fontWeight:
                    650,

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  opacity:
                    saving
                      ? 0.65
                      : 1,
                }}
              >
                {saving
                  ? "Adding..."
                  : "Add Recipient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;

  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          8,

        cursor:
          "pointer",

        whiteSpace:
          "nowrap",

        fontSize:
          13,

        color:
          "#374151",

        fontWeight:
          550,
      }}
    >
      <span
        style={{
          display:
            "flex",

          color:
            "#64748b",
        }}
      >
        {icon}
      </span>

      {label}

      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event
        ) =>
          onChange(
            event
              .target
              .checked
          )
        }
        style={{
          width:
            17,

          height:
            17,

          cursor:
            "pointer",

          accentColor:
            "#2563eb",
        }}
      />
    </label>
  );
}

function ModalOption({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;

  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          14,

        padding:
          14,

        border:
          checked
            ? "1px solid #bfdbfe"
            : "1px solid #e5e7eb",

        background:
          checked
            ? "#eff6ff"
            : "#ffffff",

        borderRadius:
          10,

        cursor:
          "pointer",
      }}
    >
      <div
        style={{
          color:
            checked
              ? "#2563eb"
              : "#64748b",

          display:
            "flex",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          flex:
            1,

          minWidth:
            0,
        }}
      >
        <div
          style={{
            fontWeight:
              650,

            color:
              "#111827",

            fontSize:
              14,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop:
              4,

            color:
              "#6b7280",

            fontSize:
              12,

            lineHeight:
              1.45,
          }}
        >
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event
        ) =>
          onChange(
            event
              .target
              .checked
          )
        }
        style={{
          width:
            18,

          height:
            18,

          cursor:
            "pointer",

          accentColor:
            "#2563eb",
        }}
      />
    </label>
  );
}