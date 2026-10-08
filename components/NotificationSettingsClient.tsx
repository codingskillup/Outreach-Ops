"use client";

import { useState } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Bell,
  Clock,
  Power,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
  CalendarCheck,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Recipient = {
  id: string;
  email: string;
  instant_issue_alert: boolean;
  daily_report: boolean;
  is_active: boolean;
  created_at: string | null;
};

type ToastNotification = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

export default function NotificationSettingsClient({
  userId,
  initialRecipients,
}: {
  userId: string;
  initialRecipients: Recipient[];
}) {
  const supabase = createClient();

  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [instantIssueAlert, setInstantIssueAlert] = useState(true);
  const [dailyReport, setDailyReport] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [testingRecipientId, setTestingRecipientId] = useState<string | null>(null);

  // Custom remove modal state
  const [recipientToRemove, setRecipientToRemove] = useState<Recipient | null>(null);
  const [removing, setRemoving] = useState(false);

  // In-app Toast state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  function triggerToast(toastData: ToastNotification) {
    setToast(toastData);
    setTimeout(() => {
      setToast((curr) => (curr === toastData ? null : curr));
    }, 5000);
  }

  function openModal() {
    setEmail("");
    setInstantIssueAlert(true);
    setDailyReport(true);
    setIsActive(true);
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setModalError(null);
  }

  async function addRecipient() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setModalError("Please enter an email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setModalError("Please enter a valid email address.");
      return;
    }

    if (!instantIssueAlert && !dailyReport) {
      setModalError("Please select at least one notification type.");
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("notification_recipients")
        .insert({
          user_id: userId,
          email: cleanEmail,
          instant_issue_alert: instantIssueAlert,
          daily_report: dailyReport,
          is_active: isActive,
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

      if (insertError) {
        if (insertError.code === "23505") {
          setModalError("This email address is already subscribed.");
        } else {
          setModalError(insertError.message);
        }
        setSaving(false);
        return;
      }

      setRecipients((current) => [...current, data as Recipient]);
      setShowModal(false);
      setEmail("");

      triggerToast({
        type: "success",
        title: "Recipient Subscribed",
        message: `${cleanEmail} will now receive configured notifications.`,
      });
    } catch {
      setModalError("An unexpected error occurred while adding recipient.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRecipient(
    id: string,
    patch: Partial<Pick<Recipient, "instant_issue_alert" | "daily_report" | "is_active">>
  ) {
    // Optimistic update
    setRecipients((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

    try {
      const { error: updateError } = await supabase
        .from("notification_recipients")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);

      if (updateError) {
        // Revert on failure
        triggerToast({
          type: "error",
          title: "Update Failed",
          message: updateError.message,
        });
        const { data } = await supabase
          .from("notification_recipients")
          .select("*")
          .eq("user_id", userId);
        if (data) setRecipients(data as Recipient[]);
      }
    } catch {
      triggerToast({
        type: "error",
        title: "Network Error",
        message: "Failed to update recipient preferences.",
      });
    }
  }

  async function handleConfirmRemove() {
    if (!recipientToRemove) return;
    setRemoving(true);

    try {
      const { error: deleteError } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("id", recipientToRemove.id)
        .eq("user_id", userId);

      if (deleteError) {
        triggerToast({
          type: "error",
          title: "Delete Failed",
          message: deleteError.message,
        });
        return;
      }

      setRecipients((current) =>
        current.filter((item) => item.id !== recipientToRemove.id)
      );

      triggerToast({
        type: "info",
        title: "Recipient Removed",
        message: `${recipientToRemove.email} will no longer receive notifications.`,
      });
    } catch {
      triggerToast({
        type: "error",
        title: "Error",
        message: "Unable to remove recipient.",
      });
    } finally {
      setRemoving(false);
      setRecipientToRemove(null);
    }
  }

  async function testRecipient(recipient: Recipient) {
    setTestingRecipientId(recipient.id);

    try {
      const response = await fetch("/api/email/test-recipient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: recipient.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        triggerToast({
          type: "error",
          title: "Test Email Failed",
          message: result.error || "Unable to dispatch test email.",
        });
        return;
      }

      triggerToast({
        type: "success",
        title: "Test Email Dispatched",
        message: `A sample notification was delivered to ${recipient.email}.`,
      });
    } catch {
      triggerToast({
        type: "error",
        title: "Delivery Error",
        message: "Unable to send test notification.",
      });
    } finally {
      setTestingRecipientId(null);
    }
  }

  const instantSubscribers = recipients.filter((r) => r.instant_issue_alert && r.is_active).length;
  const dailySubscribers = recipients.filter((r) => r.daily_report && r.is_active).length;

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/40"
                : toast.type === "error"
                ? "bg-slate-900/95 text-white border-rose-500/40"
                : "bg-slate-900/95 text-white border-slate-700/80"
            }`}
          >
            {toast.type === "success" && (
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Email Recipients */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Email Recipients
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 transition-colors">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {recipients.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              configured {recipients.length === 1 ? "inbox" : "inboxes"}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Notification endpoints</span>
            <span className="font-semibold text-slate-700">Transactional</span>
          </div>
        </div>

        {/* Instant Issue Alerts */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Instant Drift Alerts
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {instantSubscribers}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              Real-time
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Critical anomaly dispatch</span>
            <span className="font-semibold text-slate-700">&lt; 30s latency</span>
          </div>
        </div>

        {/* Daily 8 AM Digest */}
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daily 8 AM Digest
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {dailySubscribers}
            </span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
              Morning Brief
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated executive report</span>
            <span className="font-semibold text-slate-700">08:00 AM Daily</span>
          </div>
        </div>
      </div>

      {/* Main Notification Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Subscribed Email Recipients
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Manage operational stakeholders who receive instant system alerts and the automated morning executive briefing.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-sm transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recipient</span>
          </button>
        </div>

        {/* Recipients List */}
        {recipients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Mail className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No email recipients configured yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
              Add email addresses to ensure your operations team receives instant notifications when mailbox limits, warmup issues, or domain failures occur.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Recipient</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recipients.map((recipient) => {
              const isSendingTest = testingRecipientId === recipient.id;
              const initialLetter = recipient.email.charAt(0).toUpperCase();

              return (
                <div
                  key={recipient.id}
                  className={`p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors duration-150 ${
                    recipient.is_active ? "hover:bg-slate-50/70" : "bg-slate-50/40 opacity-70"
                  }`}
                >
                  {/* Recipient Identity */}
                  <div className="flex items-center gap-3.5 min-w-[240px]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                      {initialLetter}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {recipient.email}
                        </span>
                        {!recipient.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>Notification Destination</span>
                      </div>
                    </div>
                  </div>

                  {/* Notification Controls / Switches */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-50/80 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200/60">
                    <ModernSwitch
                      icon={<Bell className="w-3.5 h-3.5" />}
                      label="Drift Alerts"
                      checked={recipient.instant_issue_alert}
                      onChange={(checked) =>
                        updateRecipient(recipient.id, { instant_issue_alert: checked })
                      }
                      accentColor="rose"
                    />

                    <ModernSwitch
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Daily 8 AM"
                      checked={recipient.daily_report}
                      onChange={(checked) =>
                        updateRecipient(recipient.id, { daily_report: checked })
                      }
                      accentColor="indigo"
                    />

                    <ModernSwitch
                      icon={<Power className="w-3.5 h-3.5" />}
                      label="Active"
                      checked={recipient.is_active}
                      onChange={(checked) =>
                        updateRecipient(recipient.id, { is_active: checked })
                      }
                      accentColor="emerald"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <button
                      type="button"
                      onClick={() => testRecipient(recipient)}
                      disabled={isSendingTest}
                      title="Send test notification email to this address"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200/80 bg-indigo-50/80 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      <Send
                        className={`w-3.5 h-3.5 ${
                          isSendingTest ? "animate-spin" : ""
                        }`}
                      />
                      <span>{isSendingTest ? "Sending..." : "Test Email"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecipientToRemove(recipient)}
                      title="Remove recipient"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Information & Delivery Guide Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Instant Issue Alerts</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Real-time incident dispatch triggered when mailboxes drop connection, daily limits are breached, or DNS records degrade.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Daily 8 AM Digest</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Consolidated morning briefing covering active mailbox fleet health, warmup progress, resolved drift issues, and campaign velocity.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Verified Deliverability</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Transactional notifications are delivered with DKIM, SPF, and DMARC alignment through resilient infrastructure for high inbox placement.
          </p>
        </div>
      </div>

      {/* Add Recipient Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Add Email Recipient
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure alert subscriptions for this team member
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addRecipient();
                    }}
                    placeholder="teammate@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Subscriptions Options */}
              <div className="space-y-2.5 pt-2">
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Subscription Channels
                </span>

                <div
                  onClick={() => setInstantIssueAlert(!instantIssueAlert)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    instantIssueAlert
                      ? "bg-rose-50/60 border-rose-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      instantIssueAlert
                        ? "bg-rose-600 border-rose-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {instantIssueAlert && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-rose-500" />
                      Instant Issue Alerts
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Sends real-time email alerts whenever an account limit, connection drop, or domain issue is triggered.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setDailyReport(!dailyReport)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    dailyReport
                      ? "bg-indigo-50/60 border-indigo-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      dailyReport
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {dailyReport && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Daily 8 AM Digest Report
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Sends the consolidated morning briefing detailing all connected accounts, campaigns, and health scores.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIsActive(!isActive)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    isActive
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isActive
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Power className="w-3.5 h-3.5 text-emerald-500" />
                      Active Recipient Status
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Enable or pause all notification deliveries to this address without deleting the record.
                    </p>
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addRecipient}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span>Adding...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Recipient</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Recipient */}
      {recipientToRemove && (
        <div
          onClick={() => !removing && setRecipientToRemove(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Remove Email Recipient?
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-slate-900">
                  {recipientToRemove.email}
                </span>{" "}
                from receiving automated issue alerts and morning reports?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecipientToRemove(null)}
                disabled={removing}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removing}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {removing ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModernSwitch({
  icon,
  label,
  checked,
  onChange,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentColor: "rose" | "indigo" | "emerald";
}) {
  const activeBg =
    accentColor === "rose"
      ? "bg-rose-600"
      : accentColor === "indigo"
      ? "bg-indigo-600"
      : "bg-emerald-600";

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? activeBg : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}