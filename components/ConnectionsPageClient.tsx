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
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  ExternalLink,
  Clock,
  Sparkles,
  Info,
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

  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
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

  const smartleadConnections = useMemo(
    () => integrations.filter((item) => item.provider === "smartlead"),
    [integrations]
  );

  const emailguardConnections = useMemo(
    () => integrations.filter((item) => item.provider === "emailguard"),
    [integrations]
  );

  function triggerToast(toastData: ToastNotification) {
    setToast(toastData);
    setTimeout(() => {
      setToast((current) => (current === toastData ? null : current));
    }, 6000);
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
      setError("API key is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          name: name.trim(),
          apiKey: apiKey.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to add connection.");
        setSaving(false);
        return;
      }

      const newIntegration = result.integration as Integration;

      setIntegrations((current) => [...current, newIntegration]);
      setShowModal(false);
      setName("");
      setApiKey("");

      triggerToast({
        type: "success",
        title: "Connection Added Successfully",
        message: `Connected "${newIntegration.name}" to ${provider === "smartlead" ? "Smartlead" : "EmailGuard"}.`,
      });
    } catch {
      setError("Unable to connect. Please check your network and API key.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRemove() {
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
        type: "info",
        title: "Connection Removed",
        message: `Removed "${integrationToRemove.name}".`,
      });
    } catch {
      triggerToast({
        type: "error",
        title: "Error",
        message: "Failed to remove connection.",
      });
    } finally {
      setRemoving(false);
      setIntegrationToRemove(null);
    }
  }

  async function handleSync(integration: Integration) {
    if (syncingId === integration.id) return;
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

      // Update last_synced_at locally
      const nowIso = new Date().toISOString();
      setIntegrations((current) =>
        current.map((item) =>
          item.id === integration.id ? { ...item, last_synced_at: nowIso } : item
        )
      );

      if (integration.provider === "emailguard") {
        triggerToast({
          type: "success",
          title: "EmailGuard Sync Completed",
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
          title: "Smartlead Sync Completed",
          message: `Successfully synchronized ${integration.name}.`,
          details: [
            { label: "Accounts Synced", value: result.summary?.accountsFetched ?? 0 },
            { label: "Total Campaigns", value: result.summary?.campaigns ?? 0 },
            { label: "Active Campaigns", value: result.summary?.activeCampaigns ?? 0 },
          ],
        });
      }
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
    <div className="w-full space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-xl shadow-xl border backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-100 border-emerald-700/60"
                : toast.type === "error"
                ? "bg-rose-950/90 text-rose-100 border-rose-700/60"
                : "bg-slate-900/90 text-slate-100 border-slate-700/60"
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              {toast.type === "error" && (
                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              )}
              {toast.type === "info" && (
                <Info className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
                {toast.details && toast.details.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50">
                    {toast.details.map((detail, idx) => (
                      <div key={idx} className="text-center bg-slate-800/60 rounded-lg p-1.5">
                        <span className="block text-[10px] text-slate-400">{detail.label}</span>
                        <span className="text-xs font-bold text-white">{detail.value}</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Integrations
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {integrations.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Across Smartlead & EmailGuard
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Smartlead Accounts
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {smartleadConnections.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Campaigns & mailboxes sync
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                EmailGuard Accounts
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {emailguardConnections.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain DNS & reputation monitors
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Smartlead Section */}
      <ConnectionSection
        provider="smartlead"
        title="Smartlead Connections"
        badge="Cold Email Engine"
        badgeColor="orange"
        description="Sync mailboxes, track warmup health, daily sender limits, and monitor campaign performance."
        count={smartleadConnections.length}
        connections={smartleadConnections}
        syncingId={syncingId}
        onAdd={() => openModal("smartlead")}
        onSync={handleSync}
        onRemove={(item) => setIntegrationToRemove(item)}
      />

      {/* EmailGuard Section */}
      <ConnectionSection
        provider="emailguard"
        title="EmailGuard Connections"
        badge="Domain & DNS Security"
        badgeColor="emerald"
        description="Monitor SPF, DKIM, DMARC, DNS records, and real-time domain blacklisting."
        count={emailguardConnections.length}
        connections={emailguardConnections}
        syncingId={syncingId}
        onAdd={() => openModal("emailguard")}
        onSync={handleSync}
        onRemove={(item) => setIntegrationToRemove(item)}
      />

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
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md ${
                    provider === "smartlead"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  {provider === "smartlead" ? (
                    <Zap className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Connect {provider === "smartlead" ? "Smartlead" : "EmailGuard"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your API credentials to synchronize your accounts
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
              {/* Security Banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Your API key is securely encrypted using AES-256 before storage. Only the last 4 digits will remain visible.
                </span>
              </div>

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
                      ? "e.g., Smartlead Production, Workspace A"
                      : "e.g., EmailGuard Primary Monitor"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    API Key
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {provider === "smartlead"
                      ? "Smartlead > Settings > Profile > API"
                      : "EmailGuard > Settings > API"}
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your secret API key here"
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
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
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
                onClick={handleAddConnection}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm flex items-center gap-2 transition-all ${
                  saving
                    ? "bg-slate-400 cursor-not-allowed"
                    : provider === "smartlead"
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Connecting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Connection</span>
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
              <h3 className="text-lg font-bold text-slate-900">
                Remove Connection?
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Are you sure you want to disconnect{" "}
                <span className="font-semibold text-slate-900">
                  &ldquo;{integrationToRemove.name}&rdquo;
                </span>
                ? Automated sync for its accounts and campaigns will stop immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIntegrationToRemove(null)}
                disabled={removing}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors"
              >
                Keep Connection
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removing}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {removing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
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

function ConnectionSection({
  provider,
  title,
  badge,
  badgeColor,
  description,
  count,
  connections,
  syncingId,
  onAdd,
  onSync,
  onRemove,
}: {
  provider: Provider;
  title: string;
  badge: string;
  badgeColor: "orange" | "emerald";
  description: string;
  count: number;
  connections: Integration[];
  syncingId: string | null;
  onAdd: () => void;
  onSync: (integration: Integration) => void;
  onRemove: (integration: Integration) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300">
      {/* Section Header */}
      <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
              badgeColor === "orange"
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            }`}
          >
            {provider === "smartlead" ? (
              <Zap className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  badgeColor === "orange"
                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {badge}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                {count} {count === 1 ? "account" : "accounts"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-sm transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Add {provider === "smartlead" ? "Smartlead" : "EmailGuard"}</span>
        </button>
      </div>

      {/* Connection List / Empty State */}
      {connections.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            {provider === "smartlead" ? (
              <Zap className="w-8 h-8 text-slate-300" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            No {provider === "smartlead" ? "Smartlead" : "EmailGuard"} accounts connected
          </h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
            {provider === "smartlead"
              ? "Connect your Smartlead workspace to import active sender mailboxes, analyze daily caps, and monitor campaign statuses."
              : "Connect your EmailGuard workspace to monitor domain reputation, DMARC alignment, and DNS delivery health."}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect First Account</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {connections.map((integration) => {
            const isConnected = integration.status === "connected";
            const isSyncing = syncingId === integration.id;

            return (
              <div
                key={integration.id}
                className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors duration-150"
              >
                {/* Connection Info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="mt-1 sm:mt-0 relative flex items-center justify-center">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        isConnected ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {isConnected && (
                      <span className="absolute h-3 w-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {integration.name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200">
                        Key: •••• {integration.api_key_last4 || "****"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Last synced: {formatLastSync(integration.last_synced_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onSync(integration)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-xs font-semibold text-slate-700 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isSyncing ? "animate-spin text-indigo-600" : "text-slate-500"
                      }`}
                    />
                    <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(integration)}
                    title="Remove connection"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors shadow-sm"
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
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
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