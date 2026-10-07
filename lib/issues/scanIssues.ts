import type { SupabaseClient } from "@supabase/supabase-js";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

import {
  sendNotificationEmail,
} from "@/lib/email";

type RawData = Record<string, unknown>;

type Account = {
  id: string;
  integration_id: string;
  email: string | null;
  username: string | null;
  account_type: string | null;
  raw_data: RawData | null;
};

type Domain = {
  id: string;
  integration_id: string | null;
  domain: string;
  client: string | null;
  spf_status: string | null;
  dkim_status: string | null;
  dmarc_status: string | null;
  dmarc_policy: string | null;
  reporting_status: string | null;
  overall_status: string | null;
};

type ExistingIssue = {
  id: string;
  issue_key: string;
  status: string;
  alert_sent_at: string | null;
};

type DetectedIssue = {
  user_id: string;
  integration_id: string | null;
  email_account_id: string | null;
  issue_key: string;
  source: string;
  client: string;
  issue_type: string;
  item: string;
  account_type: string | null;
  current_value: string | null;
  expected_value: string | null;
  severity: string;
  status: string;
  last_seen_at: string;
  resolved_at: null;
};

const PAGE_SIZE = 1000;
const WRITE_CHUNK_SIZE = 500;
const ID_CHUNK_SIZE = 100;

export async function scanIssues({
  supabase,
  userId,
  sendAlerts = true,
}: {
  supabase: SupabaseClient;
  userId: string;
  sendAlerts?: boolean;
}) {
  /*
   * Load ALL rows, not only Supabase's first 1000 rows.
   * This matters for Smartlead workspaces with 1400+ accounts
   * and for resolving older issue records in a single scan.
   */
  const [
    accounts,
    domains,
    existingIssues,
  ] = await Promise.all([
    fetchAllAccounts(
      supabase,
      userId
    ),
    fetchAllDomains(
      supabase,
      userId
    ),
    fetchAllExistingIssues(
      supabase,
      userId
    ),
  ]);

  const now =
    new Date().toISOString();

  const detected: DetectedIssue[] = [];

  for (const account of accounts) {
    scanAccount(
      account,
      userId,
      now,
      detected
    );
  }

  for (const domain of domains) {
    scanDomain(
      domain,
      userId,
      now,
      detected
    );
  }

  const existingMap =
    new Map(
      existingIssues.map(
        (issue) => [
          issue.issue_key,
          issue,
        ]
      )
    );

  /*
   * Alert when:
   * 1. issue is new
   * 2. issue was resolved and has returned
   * 3. previous alert was never successfully sent
   */
  const newAlertIssues =
    detected.filter(
      (issue) => {
        const existing =
          existingMap.get(
            issue.issue_key
          );

        if (!existing) {
          return true;
        }

        if (
          existing.status ===
          "Resolved"
        ) {
          return true;
        }

        return !existing.alert_sent_at;
      }
    );

  const newAlertKeys =
    new Set(
      newAlertIssues.map(
        (issue) =>
          issue.issue_key
      )
    );

  if (detected.length > 0) {
    const issuesToUpsert =
      detected.map(
        (issue) => {
          if (
            newAlertKeys.has(
              issue.issue_key
            )
          ) {
            return {
              ...issue,
              alert_sent_at:
                null,
            };
          }

          return issue;
        }
      );

    for (
      let index = 0;
      index < issuesToUpsert.length;
      index += WRITE_CHUNK_SIZE
    ) {
      const chunk =
        issuesToUpsert.slice(
          index,
          index + WRITE_CHUNK_SIZE
        );

      const {
        error: upsertError,
      } =
        await supabase
          .from("issues")
          .upsert(
            chunk,
            {
              onConflict:
                "user_id,issue_key",
            }
          );

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }
    }
  }

  const activeKeys =
    new Set(
      detected.map(
        (issue) =>
          issue.issue_key
      )
    );

  const resolvedIds =
    existingIssues
      .filter(
        (issue) =>
          issue.status ===
            "Open" &&
          !activeKeys.has(
            issue.issue_key
          )
      )
      .map(
        (issue) =>
          issue.id
      );

  /*
   * Resolve in smaller chunks so 1000+ old issues can be
   * cleared safely without a very large .in(...) request.
   */
  for (
    let index = 0;
    index < resolvedIds.length;
    index += ID_CHUNK_SIZE
  ) {
    const chunk =
      resolvedIds.slice(
        index,
        index + ID_CHUNK_SIZE
      );

    const {
      error: resolveError,
    } =
      await supabase
        .from("issues")
        .update({
          status:
            "Resolved",
          resolved_at:
            now,
          last_seen_at:
            now,
        })
        .eq(
          "user_id",
          userId
        )
        .in(
          "id",
          chunk
        );

    if (resolveError) {
      throw new Error(
        resolveError.message
      );
    }
  }

  let alertSent = false;
  let alertError: string | null = null;

  if (
    sendAlerts &&
    newAlertIssues.length > 0
  ) {
    const alertKeys =
      newAlertIssues.map(
        (issue) =>
          issue.issue_key
      );

    try {
      const emailResult =
        await sendNewIssueAlert(
          supabase,
          userId,
          newAlertIssues
        );

      /*
       * alert_sent_at is written only after Resend confirms
       * that the email was actually sent.
       */
      if (
        emailResult.sent ===
        true
      ) {
        const alertTime =
          new Date().toISOString();

        for (
          let index = 0;
          index < alertKeys.length;
          index += ID_CHUNK_SIZE
        ) {
          const chunk =
            alertKeys.slice(
              index,
              index + ID_CHUNK_SIZE
            );

          const {
            error:
              alertUpdateError,
          } =
            await supabase
              .from("issues")
              .update({
                alert_sent_at:
                  alertTime,
              })
              .eq(
                "user_id",
                userId
              )
              .in(
                "issue_key",
                chunk
              );

          if (
            alertUpdateError
          ) {
            throw new Error(
              alertUpdateError.message
            );
          }
        }

        alertSent = true;
      } else {
        alertError =
          "reason" in emailResult &&
          typeof emailResult.reason ===
            "string"
            ? emailResult.reason
            : "Issue alert was not sent.";

        console.warn(
          "Issue alert skipped:",
          alertError
        );
      }
    } catch (error) {
      alertSent = false;
      alertError =
        error instanceof Error
          ? error.message
          : "Issue alert email failed.";

      console.error(
        "Issue alert email error:",
        alertError
      );
    }
  }

  const smartleadIssues =
    detected.filter(
      (issue) =>
        issue.source ===
        "Smartlead"
    ).length;

  const emailGuardIssues =
    detected.filter(
      (issue) =>
        issue.source ===
        "EmailGuard"
    ).length;

  const critical =
    detected.filter(
      (issue) =>
        issue.severity ===
        "Critical"
    ).length;

  const warnings =
    detected.filter(
      (issue) =>
        issue.severity ===
        "Warning"
    ).length;

  return {
    accountsChecked:
      accounts.length,
    domainsChecked:
      domains.length,
    openIssues:
      detected.length,
    smartleadIssues,
    emailGuardIssues,
    critical,
    warnings,
    resolved:
      resolvedIds.length,
    newIssues:
      newAlertIssues.length,
    alertSent,
    alertError,
  };
}

async function fetchAllAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Account[]> {
  const rows: Account[] = [];
  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from("email_accounts")
        .select(`
          id,
          integration_id,
          email,
          username,
          account_type,
          raw_data
        `)
        .eq(
          "user_id",
          userId
        )
        .order(
          "id",
          {
            ascending: true,
          }
        )
        .range(
          from,
          from + PAGE_SIZE - 1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const page =
      (data || []) as Account[];

    rows.push(...page);

    if (
      page.length < PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllDomains(
  supabase: SupabaseClient,
  userId: string
): Promise<Domain[]> {
  const rows: Domain[] = [];
  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from("domains")
        .select(`
          id,
          integration_id,
          domain,
          client,
          spf_status,
          dkim_status,
          dmarc_status,
          dmarc_policy,
          reporting_status,
          overall_status
        `)
        .eq(
          "user_id",
          userId
        )
        .order(
          "id",
          {
            ascending: true,
          }
        )
        .range(
          from,
          from + PAGE_SIZE - 1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const page =
      (data || []) as Domain[];

    rows.push(...page);

    if (
      page.length < PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllExistingIssues(
  supabase: SupabaseClient,
  userId: string
): Promise<ExistingIssue[]> {
  const rows: ExistingIssue[] = [];
  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabase
        .from("issues")
        .select(`
          id,
          issue_key,
          status,
          alert_sent_at
        `)
        .eq(
          "user_id",
          userId
        )
        .order(
          "id",
          {
            ascending: true,
          }
        )
        .range(
          from,
          from + PAGE_SIZE - 1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const page =
      (data || []) as ExistingIssue[];

    rows.push(...page);

    if (
      page.length < PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function sendNewIssueAlert(
  supabase: SupabaseClient,
  userId: string,
  issues: DetectedIssue[]
) {
  const critical =
    issues.filter(
      (issue) =>
        issue.severity ===
        "Critical"
    ).length;

  const warning =
    issues.filter(
      (issue) =>
        issue.severity ===
        "Warning"
    ).length;

  const visibleIssues =
    issues.slice(0, 50);

  const rows =
    visibleIssues
      .map(
        (issue) => `
          <tr>
            <td style="${tdStyle()}">
              ${escapeHtml(issue.client)}
            </td>
            <td style="${tdStyle()}">
              ${escapeHtml(issue.item)}
            </td>
            <td style="${tdStyle()}">
              ${escapeHtml(issue.issue_type)}
            </td>
            <td style="${tdStyle()}">
              ${escapeHtml(
                issue.current_value ||
                  "Unknown"
              )}
            </td>
            <td style="${tdStyle()}">
              ${escapeHtml(
                issue.expected_value ||
                  "N/A"
              )}
            </td>
            <td style="${tdStyle()}">
              ${escapeHtml(issue.severity)}
            </td>
          </tr>
        `
      )
      .join("");

  const remaining =
    issues.length -
    visibleIssues.length;

  return await sendNotificationEmail({
    supabase,
    userId,
    type:
      "instant_issue_alert",
    subject:
      issues.length === 1
        ? "Outreach Ops Alert: New Issue Detected"
        : `Outreach Ops Alert: ${issues.length} New Issues Detected`,
    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          color: #111827;
          padding: 24px;
        "
      >
        <h1
          style="
            font-size: 24px;
            margin: 0 0 8px;
          "
        >
          Outreach Ops Alert
        </h1>

        <p
          style="
            color: #6b7280;
            margin: 0 0 24px;
          "
        >
          New outreach infrastructure issues were detected.
        </p>

        <div
          style="
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          "
        >
          <div
            style="
              padding: 12px 16px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            "
          >
            <strong>${issues.length}</strong>
            New Issues
          </div>

          <div
            style="
              padding: 12px 16px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            "
          >
            <strong>${critical}</strong>
            Critical
          </div>

          <div
            style="
              padding: 12px 16px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            "
          >
            <strong>${warning}</strong>
            Warnings
          </div>
        </div>

        <table
          cellpadding="0"
          cellspacing="0"
          style="
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          "
        >
          <thead>
            <tr>
              <th style="${thStyle()}">Client</th>
              <th style="${thStyle()}">Account / Domain</th>
              <th style="${thStyle()}">Issue</th>
              <th style="${thStyle()}">Current</th>
              <th style="${thStyle()}">Expected</th>
              <th style="${thStyle()}">Severity</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${
          remaining > 0
            ? `
              <p
                style="
                  margin-top: 16px;
                  color: #6b7280;
                "
              >
                + ${remaining} additional issues are available in Outreach Ops.
              </p>
            `
            : ""
        }

        <p
          style="
            margin-top: 24px;
            color: #6b7280;
            font-size: 13px;
          "
        >
          This notification was generated automatically by Outreach Ops.
        </p>
      </div>
    `,
  });
}

function scanAccount(
  account: Account,
  userId: string,
  now: string,
  detected: DetectedIssue[]
) {
  const raw =
    account.raw_data || {};

  const warmupDetails =
    asObject(
      raw["warmup_details"]
    );

  const email =
    account.email ||
    account.username ||
    "Unknown account";

  const client =
    getText(
      raw["client_name"]
    ) ||
    getText(
      raw["clientName"]
    ) ||
    getText(
      raw["client"]
    ) ||
    "Unassigned";

  if (
    !isAccountType(
      account.account_type
    )
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "account_type",
        issueType:
          "Account Type",
        currentValue:
          account.account_type ||
          "Unclassified",
        expectedValue:
          "Hypertide Azure/Entra, Hypertide Google or Google Workspace",
        severity:
          "Warning",
      }
    );

    return;
  }

  const rules =
    accountRules[
      account.account_type
    ];

  /*
   * Real Smartlead field mapping confirmed from synced API data:
   * message_per_day
   * minTimeToWaitInMins
   * warmup_details.status
   * warmup_details.max_email_per_day
   * warmup_details.reply_rate
   */

  const dailyLimit =
    getNumber(
      raw[
        "message_per_day"
      ]
    );

  if (
    dailyLimit === null ||
    dailyLimit !==
      rules.dailyLimit
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "daily_limit",
        issueType:
          "Daily Limit",
        currentValue:
          dailyLimit === null
            ? "Missing"
            : String(
                dailyLimit
              ),
        expectedValue:
          String(
            rules.dailyLimit
          ),
        severity:
          "Warning",
      }
    );
  }

  const minimumGap =
    getNumber(
      raw[
        "minTimeToWaitInMins"
      ]
    );

  if (
    minimumGap === null ||
    minimumGap !==
      rules.minimumGap
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "minimum_gap",
        issueType:
          "Minimum Gap",
        currentValue:
          minimumGap === null
            ? "Missing"
            : String(
                minimumGap
              ),
        expectedValue:
          String(
            rules.minimumGap
          ),
        severity:
          "Warning",
      }
    );
  }

  const warmupEnabled =
    getWarmupEnabled(
      warmupDetails[
        "status"
      ]
    ) ??
    getBoolean(
      raw[
        "warmup_enabled"
      ]
    );

  if (
    warmupEnabled === null ||
    warmupEnabled !==
      rules.warmupEnabled
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "warmup_enabled",
        issueType:
          "Warmup",
        currentValue:
          warmupEnabled === null
            ? "Missing"
            : warmupEnabled
              ? "ON"
              : "OFF",
        expectedValue:
          rules.warmupEnabled
            ? "ON"
            : "OFF",
        severity:
          "Warning",
      }
    );
  }

  const warmupDaily =
    getNumber(
      warmupDetails[
        "max_email_per_day"
      ]
    );

  if (
    warmupDaily === null ||
    warmupDaily !==
      rules.warmupDaily
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "warmup_daily",
        issueType:
          "Warmup Daily",
        currentValue:
          warmupDaily === null
            ? "Missing"
            : String(
                warmupDaily
              ),
        expectedValue:
          String(
            rules.warmupDaily
          ),
        severity:
          "Warning",
      }
    );
  }

  const replyRate =
    getNumber(
      warmupDetails[
        "reply_rate"
      ]
    );

  if (
    replyRate === null ||
    replyRate !==
      rules.replyRate
  ) {
    addAccountIssue(
      detected,
      {
        userId,
        account,
        email,
        client,
        now,
        key:
          "reply_rate",
        issueType:
          "Reply Rate",
        currentValue:
          replyRate === null
            ? "Missing"
            : `${replyRate}%`,
        expectedValue:
          `${rules.replyRate}%`,
        severity:
          "Warning",
      }
    );
  }
}

function scanDomain(
  domain: Domain,
  userId: string,
  now: string,
  detected: DetectedIssue[]
) {
  const client =
    domain.client ||
    "Unassigned";

  if (
    normalizeValue(
      domain.spf_status
    ) === "invalid"
  ) {
    addDomainIssue(
      detected,
      {
        userId,
        domain,
        client,
        now,
        key:
          "spf",
        issueType:
          "SPF",
        currentValue:
          domain.spf_status,
        expectedValue:
          "Valid",
        severity:
          "Warning",
      }
    );
  }

  if (
    normalizeValue(
      domain.dkim_status
    ) === "invalid"
  ) {
    addDomainIssue(
      detected,
      {
        userId,
        domain,
        client,
        now,
        key:
          "dkim",
        issueType:
          "DKIM",
        currentValue:
          domain.dkim_status,
        expectedValue:
          "Valid",
        severity:
          "Warning",
      }
    );
  }

  if (
    normalizeValue(
      domain.dmarc_status
    ) === "invalid"
  ) {
    addDomainIssue(
      detected,
      {
        userId,
        domain,
        client,
        now,
        key:
          "dmarc",
        issueType:
          "DMARC",
        currentValue:
          domain.dmarc_status,
        expectedValue:
          "Valid",
        severity:
          "Critical",
      }
    );
  }

  if (
    normalizeValue(
      domain.reporting_status
    ) === "not monitored"
  ) {
    addDomainIssue(
      detected,
      {
        userId,
        domain,
        client,
        now,
        key:
          "dmarc_reporting",
        issueType:
          "DMARC Reporting",
        currentValue:
          domain.reporting_status,
        expectedValue:
          "Monitored",
        severity:
          "Warning",
      }
    );
  }
}

function addAccountIssue(
  detected: DetectedIssue[],
  options: {
    userId: string;
    account: Account;
    email: string;
    client: string;
    now: string;
    key: string;
    issueType: string;
    currentValue:
      | string
      | null;
    expectedValue:
      | string
      | null;
    severity: string;
  }
) {
  detected.push({
    user_id:
      options.userId,
    integration_id:
      options.account
        .integration_id,
    email_account_id:
      options.account.id,
    issue_key:
      `account:${options.account.id}:${options.key}`,
    source:
      "Smartlead",
    client:
      options.client,
    issue_type:
      options.issueType,
    item:
      options.email,
    account_type:
      options.account
        .account_type,
    current_value:
      options.currentValue,
    expected_value:
      options.expectedValue,
    severity:
      options.severity,
    status:
      "Open",
    last_seen_at:
      options.now,
    resolved_at:
      null,
  });
}

function addDomainIssue(
  detected: DetectedIssue[],
  options: {
    userId: string;
    domain: Domain;
    client: string;
    now: string;
    key: string;
    issueType: string;
    currentValue:
      | string
      | null;
    expectedValue:
      | string
      | null;
    severity: string;
  }
) {
  detected.push({
    user_id:
      options.userId,
    integration_id:
      options.domain
        .integration_id,
    email_account_id:
      null,
    issue_key:
      `domain:${options.domain.id}:${options.key}`,
    source:
      "EmailGuard",
    client:
      options.client,
    issue_type:
      options.issueType,
    item:
      options.domain.domain,
    account_type:
      null,
    current_value:
      options.currentValue,
    expected_value:
      options.expectedValue,
    severity:
      options.severity,
    status:
      "Open",
    last_seen_at:
      options.now,
    resolved_at:
      null,
  });
}

function asObject(
  value: unknown
): RawData {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as RawData;
  }

  return {};
}

function normalizeValue(
  value: string | null
) {
  return (
    value
      ?.trim()
      .toLowerCase() ||
    ""
  );
}

function getText(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result || null;
}

function getNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function getBoolean(
  value: unknown
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (value === 1) {
    return true;
  }

  if (value === 0) {
    return false;
  }

  if (
    typeof value ===
    "string"
  ) {
    const text =
      value
        .trim()
        .toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return null;
}

function getWarmupEnabled(
  value: unknown
) {
  const status =
    getText(value)
      ?.toUpperCase();

  if (!status) {
    return null;
  }

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
    status === "OFF" ||
    status === "PAUSED" ||
    status === "STOPPED"
  ) {
    return false;
  }

  return null;
}

function thStyle() {
  return `
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  `;
}

function tdStyle() {
  return `
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
  `;
}

function escapeHtml(
  value: string
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
