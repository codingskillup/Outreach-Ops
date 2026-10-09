"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  SlidersHorizontal,
  Tag,
  Search,
  X,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Flame,
  Check,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

export type DiscoveredAccountTag = {
  integration_id: string;
  integration_name: string;
  tag_key: string;
  tag_name: string;
  account_count: number;
};

export type AccountTypeRule = {
  id: string;
  user_id: string;
  integration_id: string;
  tag_key: string;
  tag_name: string;
  is_enabled: boolean;
  message_per_day: number | null;
  minimum_gap: number | null;
  warmup_enabled: boolean | null;
  warmup_daily: number | null;
  reply_rate: number | null;
  daily_ramp_up: number | null;
  randomize_warmup: number | null;
  daily_target_replies: number | null;
  created_at: string;
  updated_at: string;
};

type RuleForm = {
  is_enabled: boolean;
  message_per_day: string;
  minimum_gap: string;
  warmup_enabled: "" | "true" | "false";
  warmup_daily: string;
  reply_rate: string;
};

const emptyForm: RuleForm = {
  is_enabled: true,
  message_per_day: "",
  minimum_gap: "",
  warmup_enabled: "",
  warmup_daily: "",
  reply_rate: "",
};

function getRuleKey(integrationId: string, tagKey: string) {
  return `${integrationId}::${tagKey}`;
}

function numberValue(value: string) {
  if (value.trim() === "") {
    return null;
  }
  return Number(value);
}

function makeForm(rule: AccountTypeRule | undefined): RuleForm {
  if (!rule) {
    return { ...emptyForm };
  }

  return {
    is_enabled: rule.is_enabled,
    message_per_day:
      rule.message_per_day === null ? "" : String(rule.message_per_day),
    minimum_gap:
      rule.minimum_gap === null ? "" : String(rule.minimum_gap),
    warmup_enabled:
      rule.warmup_enabled === null
        ? ""
        : rule.warmup_enabled
        ? "true"
        : "false",
    warmup_daily:
      rule.warmup_daily === null ? "" : String(rule.warmup_daily),
    reply_rate:
      rule.reply_rate === null ? "" : String(rule.reply_rate),
  };
}

export default function AccountRulesSettingsClient({
  discoveredTags,
  initialRules,
}: {
  discoveredTags: DiscoveredAccountTag[];
  initialRules: AccountTypeRule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "configured" | "unconfigured">("all");

  const ruleMap = useMemo(() => {
    const map = new Map<string, AccountTypeRule>();
    for (const rule of rules) {
      map.set(getRuleKey(rule.integration_id, rule.tag_key), rule);
    }
    return map;
  }, [rules]);

  // Filter tags by search and configuration state
  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    return discoveredTags.filter((tag) => {
      const key = getRuleKey(tag.integration_id, tag.tag_key);
      const rule = ruleMap.get(key);
      const isConfigured = Boolean(
        rule &&
          (rule.message_per_day !== null ||
            rule.minimum_gap !== null ||
            rule.warmup_enabled !== null ||
            rule.warmup_daily !== null ||
            rule.reply_rate !== null)
      );

      if (filterMode === "configured" && !isConfigured) return false;
      if (filterMode === "unconfigured" && isConfigured) return false;

      if (!q) return true;
      return (
        tag.tag_name.toLowerCase().includes(q) ||
        tag.integration_name.toLowerCase().includes(q)
      );
    });
  }, [discoveredTags, search, filterMode, ruleMap]);

  function openEditor(tag: DiscoveredAccountTag) {
    const key = getRuleKey(tag.integration_id, tag.tag_key);
    if (editingKey === key) {
      setEditingKey(null);
      return;
    }

    const rule = ruleMap.get(key);
    setForm(makeForm(rule));
    setMessage("");
    setEditingKey(key);
  }

  function applyPreset(presetType: "standard" | "conservative" | "highVolume" | "clear") {
    if (presetType === "standard") {
      setForm((prev) => ({
        ...prev,
        is_enabled: true,
        message_per_day: "40",
        minimum_gap: "8",
        warmup_enabled: "true",
        warmup_daily: "30",
        reply_rate: "35",
      }));
    } else if (presetType === "conservative") {
      setForm((prev) => ({
        ...prev,
        is_enabled: true,
        message_per_day: "25",
        minimum_gap: "12",
        warmup_enabled: "true",
        warmup_daily: "20",
        reply_rate: "40",
      }));
    } else if (presetType === "highVolume") {
      setForm((prev) => ({
        ...prev,
        is_enabled: true,
        message_per_day: "50",
        minimum_gap: "5",
        warmup_enabled: "true",
        warmup_daily: "35",
        reply_rate: "30",
      }));
    } else if (presetType === "clear") {
      setForm((prev) => ({
        ...prev,
        message_per_day: "",
        minimum_gap: "",
        warmup_enabled: "",
        warmup_daily: "",
        reply_rate: "",
      }));
    }
  }

  async function saveRule(tag: DiscoveredAccountTag) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/account-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integration_id: tag.integration_id,
          tag_key: tag.tag_key,
          tag_name: tag.tag_name,
          is_enabled: form.is_enabled,
          message_per_day: numberValue(form.message_per_day),
          minimum_gap: numberValue(form.minimum_gap),
          warmup_enabled:
            form.warmup_enabled === ""
              ? null
              : form.warmup_enabled === "true",
          warmup_daily: numberValue(form.warmup_daily),
          reply_rate: numberValue(form.reply_rate),
        }),
      });

      const json = (await response.json()) as {
        rule?: AccountTypeRule;
        error?: string;
      };

      if (!response.ok || !json.rule) {
        throw new Error(json.error || "Could not save rule.");
      }

      setRules((current) => {
        const key = getRuleKey(
          json.rule!.integration_id,
          json.rule!.tag_key
        );

        const exists = current.some(
          (item) =>
            getRuleKey(item.integration_id, item.tag_key) === key
        );

        if (!exists) {
          return [...current, json.rule!];
        }

        return current.map((item) =>
          getRuleKey(item.integration_id, item.tag_key) === key
            ? json.rule!
            : item
        );
      });

      setMessage("Rule enforcement successfully updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save rule."
      );
    } finally {
      setSaving(false);
    }
  }

  const configuredRulesCount = rules.filter(
    (r) =>
      r.is_enabled &&
      (r.message_per_day !== null ||
        r.minimum_gap !== null ||
        r.warmup_enabled !== null ||
        r.warmup_daily !== null ||
        r.reply_rate !== null)
  ).length;

  return (
    <div className="w-full space-y-6">
      {/* Information Header & KPI Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Mailbox Safety Rules & Sending Limits
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Domain Protection
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Set safe daily sending caps (e.g., 30 emails/day) and warmup targets for your Smartlead mailboxes. If any inbox violates these rules, the system flags an issue immediately so your domain reputation remains safe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Tags Found
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {discoveredTags.length}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs font-semibold text-emerald-800">
              <span className="text-emerald-600/80 block text-[10px] uppercase font-bold">
                Rules Enforced
              </span>
              <span className="text-sm font-extrabold text-emerald-700">
                {configuredRulesCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tags by name or workspace..."
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "all"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({discoveredTags.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("configured")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "configured"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Configured ({configuredRulesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unconfigured")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "unconfigured"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Needs Setup ({discoveredTags.length - configuredRulesCount})
          </button>
        </div>
      </div>

      {/* Discovered Tag Cards List */}
      {discoveredTags.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Tag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            No Smartlead tags detected yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
            Connect a Smartlead integration and run a sync to automatically discover all mailbox tags and client inboxes.
          </p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No tags found matching &ldquo;{search}&rdquo;
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or reset the filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterMode("all");
            }}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTags.map((tag) => {
            const key = getRuleKey(tag.integration_id, tag.tag_key);
            const rule = ruleMap.get(key);
            const isOpen = editingKey === key;

            const hasActiveSettings = Boolean(
              rule &&
                (rule.message_per_day !== null ||
                  rule.minimum_gap !== null ||
                  rule.warmup_enabled !== null ||
                  rule.warmup_daily !== null ||
                  rule.reply_rate !== null)
            );

            return (
              <div
                key={key}
                className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => openEditor(tag)}
                  className="w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors text-left"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        hasActiveSettings && rule?.is_enabled
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-200/60"
                          : "bg-slate-100 text-slate-500 border border-slate-200/60"
                      }`}
                    >
                      <Tag className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {tag.tag_name}
                        </span>

                        {hasActiveSettings ? (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              rule?.is_enabled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {rule?.is_enabled ? "Enforced" : "Paused"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Needs Setup
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-slate-600">
                          {tag.integration_name}
                        </span>
                        <span>·</span>
                        <span>
                          {tag.account_count}{" "}
                          {tag.account_count === 1 ? "inbox" : "inboxes"} mapped
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Chips Strip & Chevron */}
                  <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                    {/* Visual Config Badges */}
                    {hasActiveSettings && rule ? (
                      <div className="hidden sm:flex flex-wrap items-center gap-1.5 text-[11px]">
                        {rule.message_per_day !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                            {rule.message_per_day}/day
                          </span>
                        )}
                        {rule.minimum_gap !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                            {rule.minimum_gap}m gap
                          </span>
                        )}
                        {rule.warmup_enabled !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-semibold text-indigo-700 border border-indigo-200/80">
                            Warmup: {rule.warmup_enabled ? "ON" : "OFF"}
                            {rule.warmup_daily !== null ? ` (${rule.warmup_daily}/d)` : ""}
                          </span>
                        )}
                        {rule.reply_rate !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 font-semibold text-emerald-700 border border-emerald-200/80">
                            {rule.reply_rate}% reply
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-slate-900 transition-colors">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Rule Configuration Panel */}
                {isOpen && (
                  <div className="border-t border-slate-200/80 p-5 sm:p-6 bg-slate-50/50 space-y-6">
                    {/* Header Strip with Toggle & Presets */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Target Mailbox Specifications
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Inboxes with this tag will be verified against these bounds. Blank parameters are ignored.
                        </p>
                      </div>

                      {/* Rule Enabled Toggle */}
                      <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                        <span>Enforce Rule:</span>
                        <input
                          type="checkbox"
                          checked={form.is_enabled}
                          onChange={(e) =>
                            setForm((curr) => ({
                              ...curr,
                              is_enabled: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            form.is_enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {form.is_enabled ? "Active" : "Disabled"}
                        </span>
                      </label>
                    </div>

                    {/* Quick Presets Bar */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Quick Configuration Presets:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset("standard")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Standard Outreach (40/d, 8m, 30 warmup)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("conservative")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Conservative Warmup (25/d, 12m, 20 warmup)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("highVolume")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>High Volume (50/d, 5m, 35 warmup)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("clear")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear Fields</span>
                        </button>
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                      {/* Message Per Day */}
                      <RuleNumberInput
                        label="Message Per Day"
                        sublabel="Max outbound daily emails"
                        value={form.message_per_day}
                        onChange={(value) =>
                          setForm((curr) => ({
                            ...curr,
                            message_per_day: value,
                          }))
                        }
                      />

                      {/* Minimum Gap */}
                      <RuleNumberInput
                        label="Minimum Gap (Minutes)"
                        sublabel="Spacing between emails"
                        value={form.minimum_gap}
                        onChange={(value) =>
                          setForm((curr) => ({
                            ...curr,
                            minimum_gap: value,
                          }))
                        }
                      />

                      {/* Warmup Enabled */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            Warmup Enabled
                          </label>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Warmup engine state
                          </span>
                        </div>

                        <select
                          value={form.warmup_enabled}
                          onChange={(e) =>
                            setForm((curr) => ({
                              ...curr,
                              warmup_enabled: e.target
                                .value as RuleForm["warmup_enabled"],
                            }))
                          }
                          className="w-full h-10 mt-3 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">Don&apos;t check (Ignore)</option>
                          <option value="true">Must be ON</option>
                          <option value="false">Must be OFF</option>
                        </select>
                      </div>

                      {/* Warmup Daily */}
                      <RuleNumberInput
                        label="Warmup Emails / Day"
                        sublabel="Target warmup volume"
                        value={form.warmup_daily}
                        onChange={(value) =>
                          setForm((curr) => ({
                            ...curr,
                            warmup_daily: value,
                          }))
                        }
                      />

                      {/* Reply Rate */}
                      <RuleNumberInput
                        label="Warmup Reply Rate %"
                        sublabel="Target response ratio"
                        value={form.reply_rate}
                        max={100}
                        onChange={(value) =>
                          setForm((curr) => ({
                            ...curr,
                            reply_rate: value,
                          }))
                        }
                      />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Diagnostic audits flag mailboxes when values mismatch these rule settings.
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveRule(tag)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          {saving ? (
                            <span>Saving Rule...</span>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save Rule Policy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {message && (
                      <div
                        className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                          message.includes("success")
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {message.includes("success") ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RuleNumberInput({
  label,
  sublabel,
  value,
  onChange,
  max,
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div>
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
        {sublabel && (
          <span className="block text-[10px] text-slate-400 mt-0.5">
            {sublabel}
          </span>
        )}
      </div>

      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Don't check"
        className="w-full h-10 mt-3 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
    </div>
  );
}