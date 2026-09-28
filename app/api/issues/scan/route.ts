import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

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

type DetectedIssue = {
  user_id: string;

  integration_id:
    | string
    | null;

  email_account_id:
    | string
    | null;

  issue_key: string;

  source: string;

  client: string;

  issue_type: string;

  item: string;

  account_type:
    | string
    | null;

  current_value:
    | string
    | null;

  expected_value:
    | string
    | null;

  severity: string;

  status: string;

  last_seen_at: string;

  resolved_at: null;
};

export async function POST() {
  const supabase =
    await createClient();

  try {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const [
      accountsResult,
      domainsResult,
    ] = await Promise.all([
      supabase
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
          user.id
        ),

      supabase
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
          user.id
        ),
    ]);

    if (
      accountsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            accountsResult
              .error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      domainsResult.error
    ) {
      return NextResponse.json(
        {
          error:
            domainsResult
              .error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    const accounts =
      (accountsResult.data ||
        []) as Account[];

    const domains =
      (domainsResult.data ||
        []) as Domain[];

    if (
      accounts.length === 0 &&
      domains.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No synced Smartlead accounts or EmailGuard domains found.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date().toISOString();

    const detected:
      DetectedIssue[] = [];

    for (
      const account of accounts
    ) {
      scanAccount(
        account,
        user.id,
        now,
        detected
      );
    }

    for (
      const domain of domains
    ) {
      scanDomain(
        domain,
        user.id,
        now,
        detected
      );
    }

    if (
      detected.length > 0
    ) {
      const {
        error: upsertError,
      } =
        await supabase
          .from("issues")
          .upsert(
            detected,
            {
              onConflict:
                "user_id,issue_key",
            }
          );

      if (
        upsertError
      ) {
        return NextResponse.json(
          {
            error:
              upsertError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    const {
      data:
        currentOpenIssues,
      error:
        currentIssuesError,
    } =
      await supabase
        .from("issues")
        .select(`
          id,
          issue_key
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "Open"
        );

    if (
      currentIssuesError
    ) {
      return NextResponse.json(
        {
          error:
            currentIssuesError
              .message,
        },
        {
          status: 500,
        }
      );
    }

    const activeKeys =
      new Set(
        detected.map(
          (issue) =>
            issue.issue_key
        )
      );

    const resolvedIds =
      (
        currentOpenIssues ||
        []
      )
        .filter(
          (issue) =>
            !activeKeys.has(
              issue.issue_key
            )
        )
        .map(
          (issue) =>
            issue.id
        );

    if (
      resolvedIds.length > 0
    ) {
      const {
        error:
          resolveError,
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
          .in(
            "id",
            resolvedIds
          );

      if (
        resolveError
      ) {
        return NextResponse.json(
          {
            error:
              resolveError
                .message,
          },
          {
            status: 500,
          }
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

    return NextResponse.json({
      success: true,

      summary: {
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Issue scan failed.",
      },
      {
        status: 500,
      }
    );
  }
}

function scanAccount(
  account: Account,
  userId: string,
  now: string,
  detected: DetectedIssue[]
) {
  const raw =
    account.raw_data || {};

  const email =
    account.email ||
    account.username ||
    "Unknown account";

  const client =
    getText(
      raw.client_name
    ) ||
    getText(
      raw.clientName
    ) ||
    getText(
      raw.client
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
          "Azure/Entra, Hypertide Google or Google Workspace",

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

  const dailyLimit =
    getNumber(
      raw.max_email_per_day
    );

  if (
    dailyLimit !== null &&
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
          String(
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

  const warmupEnabled =
    getBoolean(
      raw.warmup_enabled
    );

  if (
    warmupEnabled !== null &&
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
          warmupEnabled
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
      raw.total_warmup_per_day
    );

  if (
    warmupDaily !== null &&
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
          String(
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
      raw.reply_rate_percentage
    );

  if (
    replyRate !== null &&
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
          `${replyRate}%`,

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

function normalizeValue(
  value:
    | string
    | null
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

  if (
    value === 1
  ) {
    return true;
  }

  if (
    value === 0
  ) {
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
      text === "1"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0"
    ) {
      return false;
    }
  }

  return null;
}