"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  SlidersHorizontal,
  Tag,
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

  message_per_day:
    | number
    | null;

  minimum_gap:
    | number
    | null;

  warmup_enabled:
    | boolean
    | null;

  warmup_daily:
    | number
    | null;

  reply_rate:
    | number
    | null;

  daily_ramp_up:
    | number
    | null;

  randomize_warmup:
    | number
    | null;

  daily_target_replies:
    | number
    | null;

  created_at: string;
  updated_at: string;
};

type RuleForm = {
  is_enabled: boolean;

  message_per_day: string;
  minimum_gap: string;

  warmup_enabled:
    | ""
    | "true"
    | "false";

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

function getRuleKey(
  integrationId: string,
  tagKey: string
) {
  return `${integrationId}::${tagKey}`;
}

function numberValue(
  value: string
) {
  if (
    value.trim() === ""
  ) {
    return null;
  }

  return Number(value);
}

function makeForm(
  rule:
    | AccountTypeRule
    | undefined
): RuleForm {
  if (!rule) {
    return {
      ...emptyForm,
    };
  }

  return {
    is_enabled:
      rule.is_enabled,

    message_per_day:
      rule.message_per_day ===
      null
        ? ""
        : String(
            rule.message_per_day
          ),

    minimum_gap:
      rule.minimum_gap ===
      null
        ? ""
        : String(
            rule.minimum_gap
          ),

    warmup_enabled:
      rule.warmup_enabled ===
      null
        ? ""
        : rule.warmup_enabled
        ? "true"
        : "false",

    warmup_daily:
      rule.warmup_daily ===
      null
        ? ""
        : String(
            rule.warmup_daily
          ),

    reply_rate:
      rule.reply_rate ===
      null
        ? ""
        : String(
            rule.reply_rate
          ),
  };
}

export default function AccountRulesSettingsClient({
  discoveredTags,
  initialRules,
}: {
  discoveredTags: DiscoveredAccountTag[];
  initialRules: AccountTypeRule[];
}) {
  const [
    rules,
    setRules,
  ] =
    useState(
      initialRules
    );

  const [
    editingKey,
    setEditingKey,
  ] =
    useState<
      string | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<RuleForm>(
      emptyForm
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const ruleMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          AccountTypeRule
        >();

      for (
        const rule of rules
      ) {
        map.set(
          getRuleKey(
            rule.integration_id,
            rule.tag_key
          ),
          rule
        );
      }

      return map;
    }, [rules]);

  function openEditor(
    tag: DiscoveredAccountTag
  ) {
    const key =
      getRuleKey(
        tag.integration_id,
        tag.tag_key
      );

    if (
      editingKey === key
    ) {
      setEditingKey(null);

      return;
    }

    const rule =
      ruleMap.get(key);

    setForm(
      makeForm(rule)
    );

    setMessage("");

    setEditingKey(key);
  }

  async function saveRule(
    tag: DiscoveredAccountTag
  ) {
    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/account-rules",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                integration_id:
                  tag.integration_id,

                tag_key:
                  tag.tag_key,

                tag_name:
                  tag.tag_name,

                is_enabled:
                  form.is_enabled,

                message_per_day:
                  numberValue(
                    form.message_per_day
                  ),

                minimum_gap:
                  numberValue(
                    form.minimum_gap
                  ),

                warmup_enabled:
                  form.warmup_enabled ===
                  ""
                    ? null
                    : form.warmup_enabled ===
                      "true",

                warmup_daily:
                  numberValue(
                    form.warmup_daily
                  ),

                reply_rate:
                  numberValue(
                    form.reply_rate
                  ),
              }),
          }
        );

      const json =
        (await response.json()) as {
          rule?: AccountTypeRule;
          error?: string;
        };

      if (
        !response.ok ||
        !json.rule
      ) {
        throw new Error(
          json.error ||
            "Could not save rule."
        );
      }

      setRules(
        (current) => {
          const key =
            getRuleKey(
              json.rule!
                .integration_id,

              json.rule!
                .tag_key
            );

          const exists =
            current.some(
              (item) =>
                getRuleKey(
                  item.integration_id,
                  item.tag_key
                ) === key
            );

          if (!exists) {
            return [
              ...current,
              json.rule!,
            ];
          }

          return current.map(
            (item) =>
              getRuleKey(
                item.integration_id,
                item.tag_key
              ) === key
                ? json.rule!
                : item
          );
        }
      );

      setMessage(
        "Rule saved successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save rule."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              Smartlead Account Rules
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Tags are discovered automatically from Smartlead accounts.
              Configure only the settings you want the monitor to enforce.
              Blank fields will be ignored.
            </p>
          </div>
        </div>
      </div>

      {discoveredTags.length ===
      0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
          No Smartlead tags detected yet.
        </div>
      ) : (
        <div className="space-y-3">
          {discoveredTags.map(
            (tag) => {
              const key =
                getRuleKey(
                  tag.integration_id,
                  tag.tag_key
                );

              const rule =
                ruleMap.get(key);

              const isOpen =
                editingKey ===
                key;

              return (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openEditor(
                        tag
                      )
                    }
                    className="w-full p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {
                              tag.tag_name
                            }
                          </span>

                          {rule ? (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                rule.is_enabled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {rule.is_enabled
                                ? "Configured"
                                : "Disabled"}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Not Configured
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {
                            tag.integration_name
                          }
                          {" · "}
                          {
                            tag.account_count
                          }{" "}
                          {tag.account_count ===
                          1
                            ? "account"
                            : "accounts"}
                        </div>
                      </div>
                    </div>

                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/40">
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            Expected Settings
                          </div>

                          <p className="text-xs text-slate-500 mt-1">
                            Any configured value that does not exactly match will be flagged.
                          </p>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={
                              form.is_enabled
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  is_enabled:
                                    event
                                      .target
                                      .checked,
                                })
                              )
                            }
                          />

                          Rule enabled
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <RuleNumberInput
                          label="Message Per Day"
                          value={
                            form.message_per_day
                          }
                          onChange={(
                            value
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                message_per_day:
                                  value,
                              })
                            )
                          }
                        />

                        <RuleNumberInput
                          label="Minimum Gap"
                          value={
                            form.minimum_gap
                          }
                          onChange={(
                            value
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                minimum_gap:
                                  value,
                              })
                            )
                          }
                        />

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Warmup Enabled
                          </label>

                          <select
                            value={
                              form.warmup_enabled
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  warmup_enabled:
                                    event
                                      .target
                                      .value as RuleForm["warmup_enabled"],
                                })
                              )
                            }
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                          >
                            <option value="">
                              Don&apos;t check
                            </option>

                            <option value="true">
                              ON
                            </option>

                            <option value="false">
                              OFF
                            </option>
                          </select>
                        </div>

                        <RuleNumberInput
                          label="Warmup Emails / Day"
                          value={
                            form.warmup_daily
                          }
                          onChange={(
                            value
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                warmup_daily:
                                  value,
                              })
                            )
                          }
                        />

                        <RuleNumberInput
                          label="Reply Rate %"
                          value={
                            form.reply_rate
                          }
                          max={100}
                          onChange={(
                            value
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,
                                reply_rate:
                                  value,
                              })
                            )
                          }
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                        <p className="text-xs text-slate-500">
                          Empty fields are ignored by monitoring.
                        </p>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            saveRule(
                              tag
                            )
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {saving ? (
                            <span>
                              Saving...
                            </span>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />

                              <span>
                                Save Rule
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {message && (
                        <div className="mt-4 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />

                          {
                            message
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function RuleNumberInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
      </label>

      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder="Don't check"
        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  );
}