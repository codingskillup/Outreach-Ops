import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  sendNotificationEmail,
} from "@/lib/email";
type ScanSummary = {
  accountsChecked: number;
  domainsChecked: number;
  openIssues: number;
  smartleadIssues: number;
  emailGuardIssues: number;
  critical: number;
  warnings: number;
  resolved: number;
  newIssues: number;
  alertSent: boolean;
  alertError:
    | string
    | null;
};

type EmailAccount = {
  id: string;
  integration_id: string;
};

type Campaign = {
  id: string;
  integration_id: string;
  status: string | null;
};

type Domain = {
  id: string;
  integration_id:
    | string
    | null;
  overall_status:
    | string
    | null;
};

type Issue = {
  id: string;
  email_account_id:
    | string
    | null;
  severity: string;
  status: string;
  resolved_at:
    | string
    | null;
};

type Integration = {
  id: string;
  name: string;
  provider: string;
};

export async function sendDailyReport({
  supabase,
  userId,
  scanSummary,
}: {
  supabase: SupabaseClient;
  userId: string;
  scanSummary: ScanSummary;
}) {
  const [
    accountsResult,
    campaignsResult,
    domainsResult,
    issuesResult,
    integrationsResult,
  ] = await Promise.all([
    supabase
      .from("email_accounts")
      .select(`
        id,
        integration_id
      `)
      .eq(
        "user_id",
        userId
      ),

    supabase
      .from("campaigns")
      .select(`
        id,
        integration_id,
        status
      `)
      .eq(
        "user_id",
        userId
      ),

    supabase
      .from("domains")
      .select(`
        id,
        integration_id,
        overall_status
      `)
      .eq(
        "user_id",
        userId
      ),

    supabase
      .from("issues")
      .select(`
        id,
        email_account_id,
        severity,
        status,
        resolved_at
      `)
      .eq(
        "user_id",
        userId
      ),

    supabase
      .from("integrations")
      .select(`
        id,
        name,
        provider
      `)
      .eq(
        "user_id",
        userId
      ),
  ]);

  if (accountsResult.error) {
    throw new Error(
      accountsResult
        .error
        .message
    );
  }

  if (campaignsResult.error) {
    throw new Error(
      campaignsResult
        .error
        .message
    );
  }

  if (domainsResult.error) {
    throw new Error(
      domainsResult
        .error
        .message
    );
  }

  if (issuesResult.error) {
    throw new Error(
      issuesResult
        .error
        .message
    );
  }

  if (
    integrationsResult.error
  ) {
    throw new Error(
      integrationsResult
        .error
        .message
    );
  }

  const accounts =
    (accountsResult.data ||
      []) as EmailAccount[];

  const campaigns =
    (campaignsResult.data ||
      []) as Campaign[];

  const domains =
    (domainsResult.data ||
      []) as Domain[];

  const issues =
    (issuesResult.data ||
      []) as Issue[];

  const integrations =
    (integrationsResult.data ||
      []) as Integration[];

  const openIssues =
    issues.filter(
      (issue) =>
        issue.status ===
        "Open"
    );

  const affectedAccounts =
    new Set(
      openIssues
        .map(
          (issue) =>
            issue.email_account_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        )
    );

  const totalAccounts =
    accounts.length;

  const accountsAttention =
    affectedAccounts.size;

  const healthyAccounts =
    Math.max(
      totalAccounts -
        accountsAttention,
      0
    );

  const activeCampaigns =
    campaigns.filter(
      (campaign) =>
        campaign.status
          ?.toUpperCase() ===
        "ACTIVE"
    ).length;

  const healthyDomains =
    domains.filter(
      (domain) =>
        normalize(
          domain.overall_status
        ) === "healthy"
    ).length;

  const attentionDomains =
    domains.filter(
      (domain) =>
        normalize(
          domain.overall_status
        ) ===
        "attention"
    ).length;

  const unknownDomains =
    domains.length -
    healthyDomains -
    attentionDomains;

  const criticalIssues =
    openIssues.filter(
      (issue) =>
        issue.severity ===
        "Critical"
    ).length;

  const warningIssues =
    openIssues.filter(
      (issue) =>
        issue.severity ===
        "Warning"
    ).length;

  const yesterday =
    Date.now() -
    24 *
      60 *
      60 *
      1000;

  const resolvedLast24Hours =
    issues.filter(
      (issue) =>
        issue.status ===
          "Resolved" &&
        issue.resolved_at &&
        new Date(
          issue.resolved_at
        ).getTime() >=
          yesterday
    ).length;

  const smartleadRows =
    integrations
      .filter(
        (integration) =>
          integration.provider ===
          "smartlead"
      )
      .map((integration) => {
        const integrationAccounts =
          accounts.filter(
            (account) =>
              account.integration_id ===
              integration.id
          ).length;

        const integrationCampaigns =
          campaigns.filter(
            (campaign) =>
              campaign.integration_id ===
                integration.id &&
              campaign.status
                ?.toUpperCase() ===
                "ACTIVE"
          ).length;

        return `
          <tr>
            <td style="${td()}">
              ${escapeHtml(
                integration.name
              )}
            </td>

            <td style="${td()}">
              ${integrationAccounts.toLocaleString()}
            </td>

            <td style="${td()}">
              ${integrationCampaigns.toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join("");

  const emailGuardRows =
    integrations
      .filter(
        (integration) =>
          integration.provider ===
          "emailguard"
      )
      .map((integration) => {
        const integrationDomains =
          domains.filter(
            (domain) =>
              domain.integration_id ===
              integration.id
          ).length;

        return `
          <tr>
            <td style="${td()}">
              ${escapeHtml(
                integration.name
              )}
            </td>

            <td style="${td()}">
              ${integrationDomains.toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join("");

  const reportDate =
    new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle: "long",
        timeZone:
          "Asia/Karachi",
      }
    ).format(
      new Date()
    );

await sendNotificationEmail({
  supabase,
  userId,

  type:
    "daily_report",

  subject:
    `Outreach Ops Daily Report - ${reportDate}`,

  html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Outreach Ops Daily Report</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="width: 100%; min-width: 100%; margin: 0; padding: 32px 12px; background-color: #f1f5f9;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 680px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); text-align: left;">
                <!-- Top Accent Line -->
                <tr>
                  <td height="4" style="height: 4px; background-color: #2563eb; line-height: 4px; font-size: 1px;">&nbsp;</td>
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
                          <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">
                            ● Daily Digest
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
                      Outreach Ops Daily Report
                    </h1>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                      Infrastructure status and telemetry summary for <strong>${reportDate}</strong>.
                    </p>

                    <h2 style="${heading()}">
                      Email Accounts
                    </h2>

                    ${metricTable([
                      ["Total Accounts", totalAccounts],
                      ["Healthy", healthyAccounts],
                      ["Need Attention", accountsAttention],
                      ["Active Campaigns", activeCampaigns],
                    ])}

                    <h2 style="${heading()}">
                      Domains
                    </h2>

                    ${metricTable([
                      ["Total Domains", domains.length],
                      ["Healthy", healthyDomains],
                      ["Need Attention", attentionDomains],
                      ["Unknown", unknownDomains],
                    ])}

                    <h2 style="${heading()}">
                      Issues &amp; Drift
                    </h2>

                    ${metricTable([
                      ["Open Issues", openIssues.length],
                      ["Critical", criticalIssues],
                      ["Warnings", warningIssues],
                      ["New Issues", scanSummary?.newIssues ?? 0],
                      ["Resolved Last 24 Hours", resolvedLast24Hours],
                    ])}

                    ${
                      smartleadRows
                        ? `
                          <h2 style="${heading()}">
                            Smartlead Accounts
                          </h2>

                          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px;">
                            <table style="${table()}">
                              <thead>
                                <tr>
                                  <th style="${th()}">Connection</th>
                                  <th style="${th()}">Accounts</th>
                                  <th style="${th()}">Active Campaigns</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${smartleadRows}
                              </tbody>
                            </table>
                          </div>
                        `
                        : ""
                    }

                    ${
                      emailGuardRows
                        ? `
                          <h2 style="${heading()}">
                            EmailGuard DNS
                          </h2>

                          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px;">
                            <table style="${table()}">
                              <thead>
                                <tr>
                                  <th style="${th()}">Connection</th>
                                  <th style="${th()}">Domains</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${emailGuardRows}
                              </tbody>
                            </table>
                          </div>
                        `
                        : ""
                    }

                    ${
                      scanSummary
                        ? `
                          <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 8px;">
                              Latest Automated Scan
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #64748b; line-height: 1.6;">
                              <tr>
                                <td>Accounts inspected: <strong style="color: #0f172a;">${scanSummary.accountsChecked.toLocaleString()}</strong></td>
                                <td>Domains verified: <strong style="color: #0f172a;">${scanSummary.domainsChecked.toLocaleString()}</strong></td>
                                <td>New issues logged: <strong style="color: #0f172a;">${scanSummary.newIssues.toLocaleString()}</strong></td>
                              </tr>
                            </table>
                          </div>
                        `
                        : ""
                    }

                    <!-- Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="background-color: #0f172a; border-radius: 8px; padding: 12px 28px;">
                                <a href="https://outreach-ops.vercel.app" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; display: inline-block; letter-spacing: 0.2px;">
                                  Open Outreach Ops Dashboard &rarr;
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
                      This daily report was generated automatically according to your notification schedule.<br />
                      You can manage report frequency and delivery in Settings.
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

  return {
    totalAccounts,
    healthyAccounts,
    accountsAttention,
    activeCampaigns,
    totalDomains:
      domains.length,
    healthyDomains,
    attentionDomains,
    openIssues:
      openIssues.length,
    criticalIssues,
    warningIssues,
    resolvedLast24Hours,
  };
}

function normalize(
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

function metricTable(
  metrics:
    [string, number][]
) {
  return `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px; margin-bottom: 16px;">
      <table style="${table()}">
        <tbody>
          ${metrics
            .map(
              ([
                label,
                value,
              ], index) => `
                <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                  <td style="${td()}">
                    ${escapeHtml(
                      label
                    )}
                  </td>

                  <td
                    style="
                      ${td()}
                      text-align: right;
                      font-weight: 700;
                      color: #0f172a;
                    "
                  >
                    ${value != null ? Number(value).toLocaleString() : "0"}
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function table() {
  return `
    width: 100%;
    border-collapse: collapse;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  `;
}

function heading() {
  return `
    margin-top: 26px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #475569;
  `;
}

function th() {
  return `
    padding: 10px 14px;
    text-align: left;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #475569;
  `;
}

function td() {
  return `
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #1e293b;
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