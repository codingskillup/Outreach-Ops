import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

type RawData = Record<
  string,
  unknown
>;

type Account = {
  id: string;
  integration_id: string;
  email: string | null;
  username: string | null;
  account_type: string | null;
  raw_data: RawData | null;
};

type DetectedIssue = {
  user_id: string;
  integration_id: string;
  email_account_id: string;
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
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: accounts,
      error: accountsError,
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
          user.id
        );

    if (accountsError) {
      return NextResponse.json(
        {
          error:
            accountsError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !accounts ||
      accounts.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No synced email accounts found. Smartlead sync is required first.",
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
      const account of
      accounts as Account[]
    ) {
      scanAccount(
        account,
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

      if (upsertError) {
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
      data: currentOpenIssues,
      error: currentIssuesError,
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
          "source",
          "Smartlead"
        )
        .eq(
          "status",
          "Open"
        );

    if (currentIssuesError) {
      return NextResponse.json(
        {
          error:
            currentIssuesError.message,
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
          .in(
            "id",
            resolvedIds
          );

      if (resolveError) {
        return NextResponse.json(
          {
            error:
              resolveError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

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

        openIssues:
          detected.length,

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
    addIssue(
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
    addIssue(
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
    addIssue(
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
    addIssue(
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
    addIssue(
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

function addIssue(
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
      `${options.account.id}:${options.key}`,

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