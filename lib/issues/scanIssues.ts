import type { SupabaseClient } from "@supabase/supabase-js";



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



type AccountTypeRule = {

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

    accountTypeRules,

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

    fetchAllAccountTypeRules(

      supabase,

      userId

    ),

  ]);



  const ruleLookup =

    buildRuleLookup(

      accountTypeRules

    );



  const now =

    new Date().toISOString();



  const detected: DetectedIssue[] = [];



  for (const account of accounts) {

    scanAccount(

      account,

      userId,

      now,

      detected,

      ruleLookup

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



async function fetchAllAccountTypeRules(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountTypeRule[]> {
  const rows: AccountTypeRule[] = [];
  let from = 0;

  let clientToUse: SupabaseClient = supabase;
  const probe = await clientToUse
    .from("account_type_rules")
    .select("id")
    .limit(1);

  if (probe.error && probe.error.code === "42501") {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email,
        });
        const token = linkData?.properties?.hashed_token;
        if (token) {
          const authedClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
          );
          const { error: otpErr } = await authedClient.auth.verifyOtp({
            token_hash: token,
            type: "email",
          });
          if (!otpErr) {
            clientToUse = authedClient;
          }
        }
      }
    } catch (elevateErr) {
      console.warn("Could not elevate client for account rules:", elevateErr);
    }
  }

  while (true) {
    const { data, error } = await clientToUse
      .from("account_type_rules")
      .select(
        "id,integration_id,tag_key,tag_name,is_enabled,message_per_day,minimum_gap,warmup_enabled,warmup_daily,reply_rate"
      )
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn("fetchAllAccountTypeRules warning (proceeding with defaults):", error.message);
      return rows;
    }

    const page = (data || []) as AccountTypeRule[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
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

        .select(
          "id,integration_id,email,username,account_type,raw_data"
        )

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

        .select(
          "id,integration_id,domain,client,spf_status,dkim_status,dmarc_status,dmarc_policy,reporting_status,overall_status"
        )

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

        .select(
          "id,issue_key,status,alert_sent_at"
        )

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
  const critical = issues.filter(
    (issue) => (issue.severity || "").toLowerCase() === "critical"
  ).length;

  const warning = issues.filter(
    (issue) => (issue.severity || "").toLowerCase() === "warning"
  ).length;

  const visibleIssues = issues.slice(0, 50);

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "https://outreach-ops.vercel.app";
  const issuesUrl = `${appBaseUrl.replace(/\/$/, "")}/issues`;

  const rows = visibleIssues
    .map((issue, index) => {
      const isCritical = (issue.severity || "").toLowerCase() === "critical";
      const isWarning = (issue.severity || "").toLowerCase() === "warning";
      const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

      const badgeStyle = isCritical
        ? "display: inline-block; background-color: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;"
        : isWarning
        ? "display: inline-block; background-color: #fffbeb; color: #b45309; border: 1px solid #fcd34d; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;"
        : "display: inline-block; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;";

      const badgeText = isCritical
        ? "● Critical"
        : isWarning
        ? "▲ Warning"
        : escapeHtml(issue.severity || "Info");

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${bg};">
          <td style="padding: 12px 14px; vertical-align: top; font-size: 13px; font-weight: 600; color: #1e293b;">
            ${escapeHtml(issue.client || "Unassigned")}
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; font-weight: 600; color: #0284c7; word-break: break-all;">
              ${escapeHtml(issue.item || "—")}
            </div>
            ${
              issue.account_type
                ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${escapeHtml(issue.account_type)}</div>`
                : ""
            }
          </td>
          <td style="padding: 12px 14px; vertical-align: top; font-size: 13px; font-weight: 600; color: #334155;">
            ${escapeHtml(issue.issue_type)}
          </td>
          <td style="padding: 12px 14px; vertical-align: top; font-size: 12px; color: #0f172a; font-weight: 700;">
            ${escapeHtml(issue.current_value || "—")}
          </td>
          <td style="padding: 12px 14px; vertical-align: top; font-size: 12px; color: #64748b;">
            ${escapeHtml(issue.expected_value || "—")}
          </td>
          <td style="padding: 12px 14px; vertical-align: top; text-align: right;">
            <span style="${badgeStyle}">${badgeText}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  const remaining = issues.length - visibleIssues.length;

  return await sendNotificationEmail({
    supabase,
    userId,
    type: "instant_issue_alert",
    subject:
      issues.length === 1
        ? `Outreach Ops Alert: ${critical > 0 ? "Critical " : ""}Issue Detected (${visibleIssues[0]?.issue_type || "Infrastructure"})`
        : `Outreach Ops Alert: ${issues.length} Issues Detected (${critical} Critical, ${warning} Warnings)`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Outreach Ops Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="width: 100%; min-width: 100%; margin: 0; padding: 32px 12px; background-color: #f1f5f9;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); text-align: left;">
                <!-- Top Accent Line -->
                <tr>
                  <td height="4" style="height: 4px; background-color: ${critical > 0 ? "#dc2626" : warning > 0 ? "#d97706" : "#2563eb"}; line-height: 4px; font-size: 1px;">&nbsp;</td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 28px 32px 24px 32px;">
                    <!-- Top Brand Bar -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="background-color: #0f172a; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 6px; text-transform: uppercase;">
                                OP
                              </td>
                              <td style="padding-left: 8px; font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                                Outreach Ops
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          ${
                            critical > 0
                              ? `<span style="display: inline-block; background-color: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">● Critical Alert</span>`
                              : warning > 0
                              ? `<span style="display: inline-block; background-color: #fffbeb; color: #b45309; border: 1px solid #fcd34d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">▲ Drift Warning</span>`
                              : `<span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">● Infrastructure Notice</span>`
                          }
                        </td>
                      </tr>
                    </table>

                    <!-- Alert Heading -->
                    <h1 style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
                      Outreach Ops Alert
                    </h1>
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                      New outreach infrastructure issues were detected and require attention.
                    </p>

                    <!-- Summary Metrics Row (3-Column Bulletproof Email Table) -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 22px 0; border-collapse: separate;">
                      <tr>
                        <td width="31%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">Total Issues</div>
                          <div style="font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.1;">${issues.length}</div>
                          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Detected now</div>
                        </td>
                        <td width="3.5%"></td>
                        <td width="31%" style="background-color: ${critical > 0 ? "#fef2f2" : "#f8fafc"}; border: 1px solid ${critical > 0 ? "#fca5a5" : "#e2e8f0"}; border-radius: 8px; padding: 14px 16px; vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${critical > 0 ? "#b91c1c" : "#64748b"}; margin-bottom: 4px;">Critical</div>
                          <div style="font-size: 26px; font-weight: 800; color: ${critical > 0 ? "#dc2626" : "#0f172a"}; line-height: 1.1;">${critical}</div>
                          <div style="font-size: 11px; color: ${critical > 0 ? "#ef4444" : "#94a3b8"}; margin-top: 4px;">${critical > 0 ? "Requires action" : "None detected"}</div>
                        </td>
                        <td width="3.5%"></td>
                        <td width="31%" style="background-color: ${warning > 0 ? "#fffbeb" : "#f8fafc"}; border: 1px solid ${warning > 0 ? "#fcd34d" : "#e2e8f0"}; border-radius: 8px; padding: 14px 16px; vertical-align: top;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${warning > 0 ? "#b45309" : "#64748b"}; margin-bottom: 4px;">Warnings</div>
                          <div style="font-size: 26px; font-weight: 800; color: ${warning > 0 ? "#d97706" : "#0f172a"}; line-height: 1.1;">${warning}</div>
                          <div style="font-size: 11px; color: ${warning > 0 ? "#f59e0b" : "#94a3b8"}; margin-top: 4px;">${warning > 0 ? "Review advised" : "None detected"}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Issues Table -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 16px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; text-align: left; width: 100%;">
                        <thead>
                          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Client</th>
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Account / Domain</th>
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Issue</th>
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Current</th>
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Expected</th>
                            <th style="padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; text-align: right;">Severity</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rows}
                        </tbody>
                      </table>
                    </div>

                    ${
                      remaining > 0
                        ? `
                          <div style="margin: 14px 0 20px 0; padding: 12px 16px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 13px; color: #64748b;">
                            + <strong>${remaining} additional issues</strong> detected. View full list in the dashboard.
                          </div>
                        `
                        : ""
                    }

                    <!-- Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 26px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="background-color: #0f172a; border-radius: 8px; padding: 12px 28px;">
                                <a href="${issuesUrl}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; display: inline-block; letter-spacing: 0.2px;">
                                  Review &amp; Fix in Dashboard &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Card Footer -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                      Outreach Ops &middot; Infrastructure &amp; Drift Monitoring
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                      This notification was generated automatically by your Outreach Ops scanner.<br />
                      You can manage notification channels and thresholds in Settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}




function buildRuleLookup(

  rules: AccountTypeRule[]

) {

  const lookup =

    new Map<

      string,

      AccountTypeRule

    >();



  for (const rule of rules) {

    if (!rule.is_enabled) {

      continue;

    }



    lookup.set(

      getRuleLookupKey(

        rule.integration_id,

        rule.tag_key

      ),

      rule

    );

  }



  return lookup;

}



function findRuleForAccount(

  account: Account,

  ruleLookup: Map<string, AccountTypeRule>

) {

  const raw =

    account.raw_data || {};



  const tagNames =

    getAccountTagNames(

      raw

    );



  const tagKeys =

    tagNames.length > 0

      ? tagNames.map(

          (tagName) =>

            normalizeTagKey(

              tagName

            )

        )

      : [

          "__no_tag__",

        ];



  for (const tagKey of tagKeys) {

    const rule =

      ruleLookup.get(

        getRuleLookupKey(

          account.integration_id,

          tagKey

        )

      );



    if (rule) {

      return rule;

    }

  }



  return null;

}



function getRuleLookupKey(

  integrationId: string,

  tagKey: string

) {

  return `${integrationId}::${tagKey}`;

}



function normalizeTagKey(

  value: string

) {

  return value

    .trim()

    .toLowerCase()

    .replace(

      /\s+/g,

      " "

    );

}



function getAccountTagNames(

  raw: RawData

) {

  if (

    !Array.isArray(

      raw["tags"]

    )

  ) {

    return [];

  }



  const names =

    raw["tags"]

      .map(

        (item) => {

          if (

            typeof item ===

            "string"

          ) {

            return getText(

              item

            );

          }



          const tag =

            asObject(

              item

            );



          return (

            getText(

              tag["tag_name"]

            ) ||

            getText(

              tag["name"]

            )

          );

        }

      )

      .filter(

        (

          value

        ): value is string =>

          Boolean(value)

      );



  return Array.from(

    new Set(names)

  );

}



function scanAccount(

  account: Account,

  userId: string,

  now: string,

  detected: DetectedIssue[],

  ruleLookup: Map<string, AccountTypeRule>

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



  /*

   * Dynamic rule selection:

   * - Tags are read directly from Smartlead raw_data.

   * - No hardcoded tag names are required.

   * - Accounts without a configured rule are intentionally skipped.

   * - If an account has no tags, the synthetic "__no_tag__"

   *   rule can be configured from Settings.

   */

  const rule =

    findRuleForAccount(

      account,

      ruleLookup

    );



  if (!rule) {

    return;

  }



  /*

   * Real Smartlead field mapping confirmed from synced API data:

   * message_per_day

   * minTimeToWaitInMins

   * warmup_details.status

   * warmup_details.max_email_per_day

   * warmup_details.reply_rate

   *

   * A NULL expected value means "Don't check".

   */



  if (

    rule.message_per_day !==

    null

  ) {

    const dailyLimit =

      getNumber(

        raw[

          "message_per_day"

        ]

      );



    if (

      dailyLimit === null ||

      dailyLimit !==

        rule.message_per_day

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

            "Message Per Day",

          currentValue:

            dailyLimit === null

              ? "Missing"

              : String(

                  dailyLimit

                ),

          expectedValue:

            String(

              rule.message_per_day

            ),

          severity:

            "Warning",

          accountType:

            rule.tag_name,

        }

      );

    }

  }



  if (

    rule.minimum_gap !==

    null

  ) {

    const minimumGap =

      getNumber(

        raw[

          "minTimeToWaitInMins"

        ]

      );



    if (

      minimumGap === null ||

      minimumGap !==

        rule.minimum_gap

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

              rule.minimum_gap

            ),

          severity:

            "Warning",

          accountType:

            rule.tag_name,

        }

      );

    }

  }



  if (

    rule.warmup_enabled !==

    null

  ) {

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

        rule.warmup_enabled

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

            rule.warmup_enabled

              ? "ON"

              : "OFF",

          severity:

            "Warning",

          accountType:

            rule.tag_name,

        }

      );

    }

  }



  if (

    rule.warmup_daily !==

    null

  ) {

    const warmupDaily =

      getNumber(

        warmupDetails[

          "max_email_per_day"

        ]

      );



    if (

      warmupDaily === null ||

      warmupDaily !==

        rule.warmup_daily

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

              rule.warmup_daily

            ),

          severity:

            "Warning",

          accountType:

            rule.tag_name,

        }

      );

    }

  }



  if (

    rule.reply_rate !==

    null

  ) {

    const replyRate =

      getNumber(

        warmupDetails[

          "reply_rate"

        ]

      );



    if (

      replyRate === null ||

      replyRate !==

        rule.reply_rate

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

            `${rule.reply_rate}%`,

          severity:

            "Warning",

          accountType:

            rule.tag_name,

        }

      );

    }

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

    accountType?:

      | string

      | null;

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

      options.accountType ??

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
