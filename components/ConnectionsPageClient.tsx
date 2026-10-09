"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  X,
  Trash2,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Clock,
  ArrowUpRight,
  Server,
  Sparkles,
} from "lucide-react";

export type Provider = "smartlead" | "emailguard";

export type Integration = {
  id: string;
  provider: string;
  name: string;
  status: string | null;
  api_key_last4: string | null;
  last_synced_at: string | null;
  created_at: string | null;
};

type Props = {
  userId?: string;
  initialIntegrations: Integration[];
};

type ToastNotification = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  details?: { label: string; value: string | number }[];
};

export default function ConnectionsPageClient({
  initialIntegrations,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    (initialIntegrations || []).filter(
      (item): item is Integration => Boolean(item && typeof item === "object" && item.provider)
    )
  );
  const [showModal, setShowModal] = useState(false);
  const [provider, setProvider] = useState<Provider>("smartlead");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Custom remove confirmation modal state
  const [integrationToRemove, setIntegrationToRemove] = useState<Integration | null>(null);
  const [removing, setRemoving] = useState(false);

  // In-app Toast state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Track auto-synced connection IDs to avoid repeat loops
  const autoSyncedIdsRef = useRef<Set<string>>(new Set());

  // Filter out any undefined or malformed elements safely
  const validIntegrations = useMemo(
    () =>
      (integrations || []).filter(
        (item): item is Integration => Boolean(item && typeof item === "object" && item.provider)
      ),
    [integrations]
  );

  // Auto-sync any connection that has never been synced
  useEffect(() => {
    const unsynced = validIntegrations.find(
      (item) =>
        item &&
        !item.last_synced_at &&
        item.status === "connected" &&
        !autoSyncedIdsRef.current.has(item.id)
    );

    if (unsynced && !syncingId) {
      autoSyncedIdsRef.current.add(unsynced.id);
      triggerToast({
        type: "info",
        title: "Auto-Sync Started",
        message: `Automatically synchronizing "${unsynced.name}"...`,
      });
      handleSync(unsynced);
    }
  }, [validIntegrations, syncingId]);

  const smartleadConnections = useMemo(
    () => validIntegrations.filter((item) => item.provider === "smartlead"),
    [validIntegrations]
  );

  const emailguardConnections = useMemo(
    () => validIntegrations.filter((item) => item.provider === "emailguard"),
    [validIntegrations]
  );

  const [isSyncingAll, setIsSyncingAll] = useState(false);

  function triggerToast(toastData: ToastNotification) {
    setToast(toastData);
    setTimeout(() => {
      setToast((current) => (current === toastData ? null : current));
    }, 6000);
  }

  async function handleSyncAll() {
    if (validIntegrations.length === 0 || isSyncingAll) return;
    setIsSyncingAll(true);
    let successCount = 0;
    for (const item of validIntegrations) {
      if (!item?.id) continue;
      try {
        const endpoint =
          item.provider === "emailguard"
            ? `/api/integrations/${item.id}/emailguard-sync`
            : `/api/integrations/${item.id}/sync`;
        const res = await fetch(endpoint, { method: "POST" });
        if (res.ok) successCount++;
      } catch {
        // continue
      }
    }
    setIsSyncingAll(false);
    triggerToast({
      type: "success",
      title: "All Pipelines Synced",
      message: `Synchronized ${successCount}/${validIntegrations.length} connected platforms.`,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("outreach:refresh"));
    }
    router.refresh();
  }

  function openModal(selectedProvider: Provider) {
    setProvider(selectedProvider);
    setName("");
    setApiKey("");
    setShowApiKey(false);
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setName("");
    setApiKey("");
    setShowApiKey(false);
    setError("");
  }

  async function handleAddConnection() {
    if (!name.trim()) {
      setError("Connection name is required.");
      return;
    }

    if (!apiKey.trim()) {
      setError("API Key is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          name: name.trim(),
          apiKey: apiKey.trim(),
        }),
      });

      const result = await response.json();

      const newIntegration = (result.integration || result.data) as Integration | undefined;

      if (!newIntegration || !newIntegration.id) {
        setError(result.error || "Failed to create connection.");
        return;
      }

      setIntegrations((current) => [
        newIntegration,
        ...(current || []).filter(
          (item): item is Integration => Boolean(item && item.id && item.provider)
        ),
      ]);
      closeModal();

      triggerToast({
        type: "success",
        title: "Platform Connected",
        message: `${name} has been connected. Initial sync starting...`,
      });

      // Auto sync newly added connection immediately
      handleSync(newIntegration);
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveIntegration() {
    if (!integrationToRemove) return;
    setRemoving(true);

    try {
      const { error: deleteError } = await supabase
        .from("integrations")
        .delete()
        .eq("id", integrationToRemove.id);

      if (deleteError) {
        triggerToast({
          type: "error",
          title: "Delete Failed",
          message: deleteError.message,
        });
        return;
      }

      setIntegrations((current) =>
        current.filter((item) => item.id !== integrationToRemove.id)
      );

      triggerToast({
        type: "success",
        title: "Connection Removed",
        message: `Successfully disconnected ${integrationToRemove.name}.`,
      });

      setIntegrationToRemove(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("outreach:refresh"));
      }
      router.refresh();
    } catch {
      triggerToast({
        type: "error",
        title: "Error",
        message: "Failed to remove integration.",
      });
    } finally {
      setRemoving(false);
    }
  }

  async function handleSync(integration: Integration) {
    if (syncingId) return;
    setSyncingId(integration.id);

    try {
      const endpoint =
        integration.provider === "emailguard"
          ? `/api/integrations/${integration.id}/emailguard-sync`
          : `/api/integrations/${integration.id}/sync`;

      const response = await fetch(endpoint, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        triggerToast({
          type: "error",
          title: "Sync Failed",
          message: result.error || "Unable to sync connection.",
        });
        return;
      }

      const nowIso = new Date().toISOString();
      setIntegrations((current) =>
        current.map((item) =>
          item.id === integration.id ? { ...item, last_synced_at: nowIso } : item
        )
      );

      if (integration.provider === "emailguard") {
        triggerToast({
          type: "success",
          title: "EmailGuard Synced",
          message: `Successfully synchronized ${integration.name}.`,
          details: [
            { label: "Domains Monitored", value: result.summary?.domains ?? 0 },
            { label: "Healthy", value: result.summary?.healthy ?? 0 },
            { label: "Need Attention", value: result.summary?.attention ?? 0 },
          ],
        });
      } else {
        triggerToast({
          type: "success",
          title: "Smartlead Synced",
          message: `Successfully synchronized ${integration.name}.`,
          details: [
            { label: "Accounts Synced", value: result.summary?.accountsFetched ?? 0 },
            { label: "Total Campaigns", value: result.summary?.campaigns ?? 0 },
            { label: "Active Campaigns", value: result.summary?.activeCampaigns ?? 0 },
          ],
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("outreach:refresh"));
      }
      router.refresh();
    } catch {
      triggerToast({
        type: "error",
        title: "Sync Error",
        message: "Network error occurred while syncing connection.",
      });
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/40"
                : toast.type === "error"
                ? "bg-slate-900/95 text-white border-rose-500/40"
                : "bg-slate-900/95 text-white border-slate-700/80"
            }`}
          >
            <div className="flex items-start gap-3">
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
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{toast.title}</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
                {toast.details && toast.details.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                    {toast.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="text-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-1.5"
                      >
                        <span className="block text-[10px] font-medium text-slate-400">
                          {detail.label}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
        </div>
      )}

      {/* 1. Supported Platform Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Smartlead Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Smartlead</h3>
                  <p className="text-xs text-slate-500">Cold Email & Multi-Inbox Engine</p>
                </div>
              </div>

              {smartleadConnections.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {smartleadConnections.length} Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Synchronize mailboxes, warmup progress, daily sender caps, and campaign deliverability in real time.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              API Integration
            </span>
            <button
              type="button"
              onClick={() => openModal("smartlead")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Smartlead</span>
            </button>
          </div>
        </div>

        {/* EmailGuard Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">EmailGuard</h3>
                  <p className="text-xs text-slate-500">Domain & DNS Security Engine</p>
                </div>
              </div>

              {emailguardConnections.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {emailguardConnections.length} Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Continuous monitoring of SPF, DKIM, DMARC alignment, DNS records, and domain blacklists.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              API Integration
            </span>
            <button
              type="button"
              onClick={() => openModal("emailguard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect EmailGuard</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Connections Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header with Title and Global Sync */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Connected Workspaces
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                {validIntegrations.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active API credentials synchronized with your fleet.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={validIntegrations.length === 0 || isSyncingAll}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200/90 shadow-2xs disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncingAll ? "animate-spin text-indigo-600" : ""}`} />
            <span>{isSyncingAll ? "Syncing Pipelines..." : "Sync All Pipelines"}</span>
          </button>
        </div>

        {/* Empty State */}
        {validIntegrations.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Server className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No integrations connected yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
              Connect your Smartlead or EmailGuard API key above to start aggregating outreach metrics.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {validIntegrations.map((integration) => {
              const isSmartlead = integration.provider === "smartlead";
              const isSyncing = syncingId === integration.id;

              return (
                <div
                  key={integration.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isSmartlead
                          ? "bg-amber-50 border border-amber-200/70 text-amber-700"
                          : "bg-emerald-50 border border-emerald-200/70 text-emerald-700"
                      }`}
                    >
                      {isSmartlead ? (
                        <Zap className="w-4 h-4 fill-amber-500" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {integration.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSmartlead
                              ? "bg-amber-100/70 text-amber-800 border border-amber-200/60"
                              : "bg-emerald-100/70 text-emerald-800 border border-emerald-200/60"
                          }`}
                        >
                          {isSmartlead ? "Smartlead" : "EmailGuard"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200/80">
                          Key: •••• {integration.api_key_last4 || "****"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatLastSync(integration.last_synced_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Direct Links */}
                    {isSmartlead ? (
                      <div className="hidden md:flex items-center gap-1.5 mr-1">
                        <Link
                          href="/emailaccounts"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition-colors"
                        >
                          <span>Mailboxes</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                        <Link
                          href="/campaigns"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition-colors"
                        >
                          <span>Campaigns</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    ) : (
                      <div className="hidden md:flex items-center gap-1.5 mr-1">
                        <Link
                          href="/domains"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition-colors"
                        >
                          <span>Domains</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    )}

                    {/* Sync Button */}
                    <button
                      type="button"
                      onClick={() => handleSync(integration)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-xs font-semibold text-slate-700 shadow-2xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isSyncing ? "animate-spin text-indigo-600" : "text-slate-500"
                        }`}
                      />
                      <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => setIntegrationToRemove(integration)}
                      title="Disconnect workspace"
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Connection Modal */}
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
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md ${
                    provider === "smartlead"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  {provider === "smartlead" ? (
                    <Zap className="w-5 h-5 fill-white" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Connect {provider === "smartlead" ? "Smartlead" : "EmailGuard"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter API credentials to link your infrastructure
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
                  Connection Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    provider === "smartlead"
                      ? "e.g., Smartlead Production"
                      : "e.g., EmailGuard Primary"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste secret API key"
                    autoComplete="off"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {provider === "smartlead"
                    ? "Found in Smartlead.ai → Settings → Profile → API Keys"
                    : "Found in EmailGuard.io → Settings → API Access"}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddConnection}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect Platform</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Connection */}
      {integrationToRemove && (
        <div
          onClick={() => !removing && setIntegrationToRemove(null)}
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
              <h3 className="text-base font-bold text-slate-900">
                Disconnect {integrationToRemove.name}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will remove the API integration. Synchronized data will remain cached until the next refresh.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIntegrationToRemove(null)}
                disabled={removing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveIntegration}
                disabled={removing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-2xs"
              >
                {removing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Disconnect</span>
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

function formatLastSync(value: string | null): string {
  if (!value) return "Never synced";
  try {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}