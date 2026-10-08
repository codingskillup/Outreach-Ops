"use client";

import { useMemo, useState, type ReactNode } from "react";

type RawData = Record<string, unknown>;

type AccountTag = {
  key: string;
  name: string;
};

type RealAccount = {
  id: string;
  external_id: number;
  email: string | null;
  from_name: string | null;
  username: string | null;
  account_type: string | null;
  raw_data: RawData | null;
  synced_at: string;
  integration_id: string;
  integrations:
    | {
        id: string;
        name: string;
        provider: string;
      }
    | {
        id: string;
        name: string;
        provider: string;
      }[]
    | null;
};

export type EmailAccountRule = {
  id: string;
  integration_id: string;
  tag_key: string;
  tag_name: string;
  is_enabled: boolean;
  message_per_day: number | null;
  minimum_gap: number | null;
  warmup_enabled: boolean | null;
  warmup_daily: number | null;
  reply_rate: number | null;
};

type DisplayAccount = {
  id: string;
  integrationId: string;
  email: string;
  client: string;
  smartlead: string;
  tags: AccountTag[];
  dailyLimit: number | null;
  minimumGap: number | null;
  warmupEnabled: boolean | null;
  warmupDaily: number | null;
  reputation: number | null;
  bounceRate: number | null;
  replyRate: number | null;
};

type HealthStatus = "healthy" | "attention" | "not_evaluated";

type FieldEvaluation<T> = {
  configured: boolean;
  conflict: boolean;
  expected: T | null;
  wrong: boolean;
};

type AccountEvaluation = {
  status: HealthStatus;
  matchedRuleNames: string[];
  dailyLimit: FieldEvaluation<number>;
  minimumGap: FieldEvaluation<number>;
  warmupEnabled: FieldEvaluation<boolean>;
  warmupDaily: FieldEvaluation<number>;
  replyRate: FieldEvaluation<number>;
};

type AccountStatusRow = {
  account: DisplayAccount;
  evaluation: AccountEvaluation;
};

function ruleMapKey(
  integrationId: string,
  tagKey: string
) {
  return `${integrationId}::${tagKey}`;
}

export default function EmailAccountsPageClient({
  realAccounts = [],
  rules = [],
}: {
  realAccounts?: RealAccount[];
  rules?: EmailAccountRule[];
}) {
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] =
    useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [smartleadFilter, setSmartleadFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const accounts = useMemo(
    () => realAccounts.map(convertRealAccount),
    [realAccounts]
  );

  const enabledRuleMap = useMemo(() => {
    const map = new Map<string, EmailAccountRule>();

    for (const rule of rules) {
      if (!rule.is_enabled) {
        continue;
      }

      map.set(
        ruleMapKey(rule.integration_id, rule.tag_key),
        rule
      );
    }

    return map;
  }, [rules]);

  const accountStatuses: AccountStatusRow[] = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        evaluation: evaluateAccount(
          account,
          enabledRuleMap
        ),
      })),
    [accounts, enabledRuleMap]
  );

  const clients = useMemo(
    () =>
      Array.from(
        new Set(accounts.map((item) => item.client))
      ).sort(),
    [accounts]
  );

  const smartleads = useMemo(
    () =>
      Array.from(
        new Set(accounts.map((item) => item.smartlead))
      ).sort(),
    [accounts]
  );

  const accountTypes = useMemo(() => {
    const names = new Set<string>();

    for (const account of accounts) {
      for (const tag of account.tags) {
        names.add(tag.name);
      }
    }

    return Array.from(names).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [accounts]);

  const tagDistribution = useMemo(() => {
    const counts = new Map<string, number>();

    for (const account of accounts) {
      const uniqueTagNames = new Set<string>(
        account.tags.map((tag) => tag.name)
      );

      for (const tagName of uniqueTagNames) {
        counts.set(
          tagName,
          (counts.get(tagName) || 0) + 1
        );
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return accountStatuses.filter(
      ({ account, evaluation }) => {
        const tagText = account.tags
          .map((tag) => tag.name)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !searchValue ||
          account.email.toLowerCase().includes(searchValue) ||
          account.client.toLowerCase().includes(searchValue) ||
          tagText.includes(searchValue);

        const matchesType =
          accountTypeFilter === "all" ||
          account.tags.some(
            (tag) => tag.name === accountTypeFilter
          );

        const matchesClient =
          clientFilter === "all" ||
          account.client === clientFilter;

        const matchesSmartlead =
          smartleadFilter === "all" ||
          account.smartlead === smartleadFilter;

        const matchesStatus =
          statusFilter === "all" ||
          evaluation.status === statusFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesClient &&
          matchesSmartlead &&
          matchesStatus
        );
      }
    );
  }, [
    accountStatuses,
    search,
    accountTypeFilter,
    clientFilter,
    smartleadFilter,
    statusFilter,
  ]);

  const healthyCount = accountStatuses.filter(
    (item) => item.evaluation.status === "healthy"
  ).length;

  const attentionCount = accountStatuses.filter(
    (item) => item.evaluation.status === "attention"
  ).length;

  const notEvaluatedCount = accountStatuses.filter(
    (item) =>
      item.evaluation.status === "not_evaluated"
  ).length;

  const configuredRulesCount = rules.filter(
    (rule) => rule.is_enabled
  ).length;

  return (
    <div className="w-full min-w-0 text-slate-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-[28px] font-bold tracking-tight text-slate-900">
            Email Accounts
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Monitor sending settings against the dynamic rules configured in Settings.
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
          Live Data
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard
          title="Total Accounts"
          value={accounts.length}
        />
        <SummaryCard
          title="Healthy"
          value={healthyCount}
          tone="success"
        />
        <SummaryCard
          title="Need Attention"
          value={attentionCount}
          tone="warning"
        />
        <SummaryCard
          title="Not Evaluated"
          value={notEvaluatedCount}
          tone="neutral"
        />
        <SummaryCard
          title="Configured Rules"
          value={configuredRulesCount}
        />
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Account Type Distribution
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Discovered automatically from Smartlead account tags.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500">
            {accountTypes.length} active {accountTypes.length === 1 ? "tag" : "tags"}
          </div>
        </div>

        {tagDistribution.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {tagDistribution.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => setAccountTypeFilter(tag.name)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="truncate text-[11px] font-semibold text-slate-500">
                  {tag.name}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {tag.count.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center text-sm text-slate-400">
            No account tags detected.
          </div>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search email, client or tag"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 xl:col-span-1"
          />

          <select
            value={accountTypeFilter}
            onChange={(event) =>
              setAccountTypeFilter(event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">All Account Types</option>
            {accountTypes.map((accountType) => (
              <option key={accountType} value={accountType}>
                {accountType}
              </option>
            ))}
          </select>

          <select
            value={clientFilter}
            onChange={(event) =>
              setClientFilter(event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">All Clients</option>
            {clients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          <select
            value={smartleadFilter}
            onChange={(event) =>
              setSmartleadFilter(event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">All Smartlead</option>
            {smartleads.map((smartlead) => (
              <option key={smartlead} value={smartlead}>
                {smartlead}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="attention">Need Attention</option>
            <option value="not_evaluated">Not Evaluated</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">
              Accounts
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {filteredAccounts.length.toLocaleString()} shown
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
              {healthyCount.toLocaleString()} healthy
            </span>
            {attentionCount > 0 && (
              <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700">
                {attentionCount.toLocaleString()} attention
              </span>
            )}
            {notEvaluatedCount > 0 && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">
                {notEvaluatedCount.toLocaleString()} not evaluated
              </span>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-[1180px] w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <TableHeader text="Email" width="18%" />
                <TableHeader text="Client" width="11%" />
                <TableHeader text="Account Type" width="16%" />
                <TableHeader text="Smartlead" width="10%" />
                <TableHeader text="Daily Limit" width="8%" />
                <TableHeader text="Minimum Gap" width="8%" />
                <TableHeader text="Warmup" width="7%" />
                <TableHeader text="Warmup Daily" width="8%" />
                <TableHeader text="Reply Rate" width="7%" />
                <TableHeader text="Bounce" width="6%" />
                <TableHeader text="Status" width="7%" />
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.map(({ account, evaluation }) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  evaluation={evaluation}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredAccounts.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            No email accounts found.
          </div>
        )}
      </div>
    </div>
  );
}

function AccountRow({
  account,
  evaluation,
}: {
  account: DisplayAccount;
  evaluation: AccountEvaluation;
}) {
  const evaluated = evaluation.status !== "not_evaluated";

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/50">
      <TableCell>
        <div
          className="truncate font-bold text-slate-900"
          title={account.email}
        >
          {account.email}
        </div>
      </TableCell>

      <TableCell>{account.client}</TableCell>

      <TableCell>
        <TagBadges tags={account.tags} />
      </TableCell>

      <TableCell>{account.smartlead}</TableCell>

      <TableCell>
        <ValueCheck
          value={account.dailyLimit}
          field={evaluation.dailyLimit}
          evaluated={evaluated}
        />
      </TableCell>

      <TableCell>
        <ValueCheck
          value={account.minimumGap}
          field={evaluation.minimumGap}
          evaluated={evaluated}
        />
      </TableCell>

      <TableCell>
        <WarmupBadge
          enabled={account.warmupEnabled}
          field={evaluation.warmupEnabled}
          evaluated={evaluated}
        />
      </TableCell>

      <TableCell>
        <ValueCheck
          value={account.warmupDaily}
          field={evaluation.warmupDaily}
          evaluated={evaluated}
        />
      </TableCell>

      <TableCell>
        <ValueCheck
          value={account.replyRate}
          field={evaluation.replyRate}
          evaluated={evaluated}
          suffix="%"
        />
      </TableCell>

      <TableCell>
        {account.bounceRate !== null
          ? `${account.bounceRate}%`
          : "—"}
      </TableCell>

      <TableCell>
        <StatusBadge status={evaluation.status} />
      </TableCell>
    </tr>
  );
}

function evaluateAccount(
  account: DisplayAccount,
  enabledRuleMap: Map<string, EmailAccountRule>
): AccountEvaluation {
  const matchedRules = account.tags
    .map((tag) =>
      enabledRuleMap.get(
        ruleMapKey(account.integrationId, tag.key)
      )
    )
    .filter((rule): rule is EmailAccountRule => Boolean(rule));

  if (matchedRules.length === 0) {
    return {
      status: "not_evaluated",
      matchedRuleNames: [],
      dailyLimit: emptyFieldEvaluation<number>(),
      minimumGap: emptyFieldEvaluation<number>(),
      warmupEnabled: emptyFieldEvaluation<boolean>(),
      warmupDaily: emptyFieldEvaluation<number>(),
      replyRate: emptyFieldEvaluation<number>(),
    };
  }

  const dailyLimit = evaluateField(
    account.dailyLimit,
    matchedRules.map((rule) => rule.message_per_day)
  );

  const minimumGap = evaluateField(
    account.minimumGap,
    matchedRules.map((rule) => rule.minimum_gap)
  );

  const warmupEnabled = evaluateField(
    account.warmupEnabled,
    matchedRules.map((rule) => rule.warmup_enabled)
  );

  const warmupDaily = evaluateField(
    account.warmupDaily,
    matchedRules.map((rule) => rule.warmup_daily)
  );

  const replyRate = evaluateField(
    account.replyRate,
    matchedRules.map((rule) => rule.reply_rate)
  );

  const fields = [
    dailyLimit,
    minimumGap,
    warmupEnabled,
    warmupDaily,
    replyRate,
  ];

  const hasConfiguredField = fields.some(
    (field) => field.configured
  );

  const status: HealthStatus = !hasConfiguredField
    ? "not_evaluated"
    : fields.some((field) => field.wrong)
    ? "attention"
    : "healthy";

  return {
    status,
    matchedRuleNames: matchedRules.map((rule) => rule.tag_name),
    dailyLimit,
    minimumGap,
    warmupEnabled,
    warmupDaily,
    replyRate,
  };
}

function evaluateField<T extends number | boolean>(
  actual: T | null,
  expectedValues: Array<T | null>
): FieldEvaluation<T> {
  const configuredValues = expectedValues.filter(
    (value): value is T => value !== null
  );

  if (configuredValues.length === 0) {
    return emptyFieldEvaluation<T>();
  }

  const uniqueValues = Array.from(new Set(configuredValues));

  if (uniqueValues.length > 1) {
    return {
      configured: true,
      conflict: true,
      expected: null,
      wrong: true,
    };
  }

  const expected = uniqueValues[0];

  return {
    configured: true,
    conflict: false,
    expected,
    wrong: actual === null || actual !== expected,
  };
}

function emptyFieldEvaluation<T extends number | boolean>(): FieldEvaluation<T> {
  return {
    configured: false,
    conflict: false,
    expected: null,
    wrong: false,
  };
}

function convertRealAccount(account: RealAccount): DisplayAccount {
  const raw = account.raw_data || {};
  const warmupDetails = asObject(raw.warmup_details);

  const integration = Array.isArray(account.integrations)
    ? account.integrations[0]
    : account.integrations;

  return {
    id: account.id,
    integrationId: account.integration_id,
    email:
      account.email || account.username || "Unknown",
    client:
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      getText(raw.client) ||
      "Unassigned",
    smartlead: integration?.name || "Smartlead",
    tags: getAccountTags(raw),
    dailyLimit: getNumber(raw.message_per_day),
    minimumGap: getNumber(raw.minTimeToWaitInMins),
    warmupEnabled: getWarmupEnabled(warmupDetails.status),
    warmupDaily:
      getNumber(warmupDetails.max_email_per_day) ??
      getNumber(warmupDetails.warmup_max_count),
    reputation:
      getNumber(raw.warmup_reputation) ??
      getNumber(warmupDetails.warmup_reputation),
    bounceRate: getNumber(raw.bounce_rate),
    replyRate: getNumber(warmupDetails.reply_rate),
  };
}

function getAccountTags(raw: RawData): AccountTag[] {
  if (!Array.isArray(raw.tags) || raw.tags.length === 0) {
    return [
      {
        key: "__no_tag__",
        name: "No Tag",
      },
    ];
  }

  const tags = raw.tags
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();

        if (!name) {
          return null;
        }

        return {
          key: normalizeTagKey(name),
          name,
        };
      }

      const object = asObject(item);
      const name =
        getText(object.tag_name) || getText(object.name);

      if (!name) {
        return null;
      }

      return {
        key: normalizeTagKey(name),
        name,
      };
    })
    .filter((tag): tag is AccountTag => Boolean(tag));

  if (tags.length === 0) {
    return [
      {
        key: "__no_tag__",
        name: "No Tag",
      },
    ];
  }

  const unique = new Map<string, AccountTag>();

  for (const tag of tags) {
    unique.set(tag.key, tag);
  }

  return Array.from(unique.values());
}

function normalizeTagKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function asObject(value: unknown): RawData {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as RawData;
  }

  return {};
}

function getWarmupEnabled(value: unknown) {
  const directBoolean = getBoolean(value);

  if (directBoolean !== null) {
    return directBoolean;
  }

  if (typeof value !== "string") {
    return null;
  }

  const status = value.trim().toUpperCase();

  if (
    status === "ACTIVE" ||
    status === "ENABLED" ||
    status === "ON"
  ) {
    return true;
  }

  if (
    status === "INACTIVE" ||
    status === "DISABLED" ||
    status === "PAUSED" ||
    status === "STOPPED" ||
    status === "OFF"
  ) {
    return false;
  }

  return null;
}

function getText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();
  return result || null;
}

function getNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1) {
    return true;
  }

  if (value === 0) {
    return false;
  }

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "on" ||
      text === "enabled" ||
      text === "active"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "off" ||
      text === "disabled" ||
      text === "inactive"
    ) {
      return false;
    }
  }

  return null;
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
  tone?: "default" | "success" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "neutral"
      ? "text-slate-600"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className={`mt-2 text-2xl font-bold ${valueClass}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TableHeader({
  text,
  width,
}: {
  text: string;
  width?: string;
}) {
  return (
    <th
      style={{ width }}
      className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500"
    >
      {text}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="overflow-hidden whitespace-nowrap px-3 py-3 text-[11px] text-slate-600">
      {children}
    </td>
  );
}

function TagBadges({ tags }: { tags: AccountTag[] }) {
  const visible = tags.slice(0, 2);
  const remaining = tags.length - visible.length;

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {visible.map((tag) => (
        <span
          key={tag.key}
          title={tag.name}
          className="max-w-[150px] truncate rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-slate-700"
        >
          {tag.name}
        </span>
      ))}

      {remaining > 0 && (
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function ValueCheck({
  value,
  field,
  evaluated,
  suffix = "",
}: {
  value: number | null;
  field: FieldEvaluation<number>;
  evaluated: boolean;
  suffix?: string;
}) {
  if (value === null) {
    return (
      <div>
        <EmptyValue />
        {field.configured && (
          <ExpectedValue
            field={field}
            suffix={suffix}
          />
        )}
      </div>
    );
  }

  const colorClass = !evaluated || !field.configured
    ? "text-slate-700"
    : field.wrong
    ? "text-amber-700"
    : "text-emerald-700";

  return (
    <div>
      <div className={`font-bold ${colorClass}`}>
        {value}
        {suffix}
      </div>
      {field.wrong && (
        <ExpectedValue
          field={field}
          suffix={suffix}
        />
      )}
    </div>
  );
}

function ExpectedValue({
  field,
  suffix = "",
}: {
  field: FieldEvaluation<number>;
  suffix?: string;
}) {
  if (!field.configured) {
    return null;
  }

  return (
    <div className="mt-0.5 text-[9px] text-slate-400">
      {field.conflict
        ? "Conflicting rules"
        : `Expected ${field.expected}${suffix}`}
    </div>
  );
}

function WarmupBadge({
  enabled,
  field,
  evaluated,
}: {
  enabled: boolean | null;
  field: FieldEvaluation<boolean>;
  evaluated: boolean;
}) {
  if (enabled === null) {
    return (
      <div>
        <EmptyValue />
        {field.configured && field.expected !== null && (
          <div className="mt-0.5 text-[9px] text-slate-400">
            Expected {field.expected ? "ON" : "OFF"}
          </div>
        )}
      </div>
    );
  }

  const className = !evaluated || !field.configured
    ? "bg-slate-100 text-slate-700"
    : field.wrong
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";

  return (
    <div>
      <span
        className={`inline-block rounded-md px-2 py-1 text-[9px] font-bold ${className}`}
      >
        {enabled ? "ON" : "OFF"}
      </span>

      {field.wrong && field.configured && (
        <div className="mt-0.5 text-[9px] text-slate-400">
          {field.conflict
            ? "Conflicting rules"
            : `Expected ${field.expected ? "ON" : "OFF"}`}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: HealthStatus }) {
  if (status === "healthy") {
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
        Healthy
      </span>
    );
  }

  if (status === "attention") {
    return (
      <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
        Attention
      </span>
    );
  }

  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
      Not Evaluated
    </span>
  );
}

function EmptyValue() {
  return <span className="text-slate-400">—</span>;
}

const selectClassName =
  "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400";
