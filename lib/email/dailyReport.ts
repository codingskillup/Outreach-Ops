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
  raw_data?: Record<string, unknown> | null;
};

type Domain = {
  id: string;
  integration_id: string | null;
  overall_status: string | null;
  domain?: string | null;
};

type Issue = {
  id: string;
  email_account_id: string | null;
  severity: string;
  status: string;
  resolved_at: string | null;
};

type Integration = {
  id: string;
  name: string;
  provider: string;
  status?: string | null;
};

/**
 * Loads all rows across pagination boundaries (bypassing PostgREST default 1,000 limit)
 */
async function loadAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: any; error: any }>
): Promise<T[]> {
  const rows: T[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as T[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;

    if (from > 100000) {
      break;
    }
  }

  return rows;
}

function isMainCampaign(campaign: Campaign): boolean {
  const raw = (campaign.raw_data || {}) as Record<string, unknown>;
  const parentId = raw.parent_campaign_id;
  return parentId === null || parentId === undefined || parentId === "";
}

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
    accounts,
    campaigns,
    domains,
    issues,
    integrationsResult,
  ] = await Promise.all([
    loadAllRows<EmailAccount>((from, to) =>
      supabase
        .from("email_accounts")
        .select("id, integration_id")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    loadAllRows<Campaign>((from, to) =>
      supabase
        .from("campaigns")
        .select("id, integration_id, status, raw_data")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    loadAllRows<Domain>((from, to) =>
      supabase
        .from("domains")
        .select("id, integration_id, overall_status, domain")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    loadAllRows<Issue>((from, to) =>
      supabase
        .from("issues")
        .select("id, email_account_id, severity, status, resolved_at")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    ),
    supabase
      .from("integrations")
      .select("id, name, provider, status")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  ]);

  if (integrationsResult.error) {
    throw new Error(integrationsResult.error.message);
  }

  const integrations = (integrationsResult.data || []) as Integration[];

  const openIssues = issues.filter((issue) => issue.status === "Open");

  const affectedAccounts = new Set(
    openIssues
      .map((issue) => issue.email_account_id)
      .filter((id): id is string => Boolean(id))
  );

  const totalAccounts = accounts.length;
  const accountsAttention = affectedAccounts.size;
  const healthyAccounts = Math.max(totalAccounts - accountsAttention, 0);

  const mainCampaigns = campaigns.filter(isMainCampaign);
  const activeCampaigns = mainCampaigns.filter(
    (campaign) => campaign.status?.toUpperCase() === "ACTIVE"
  ).length;

  const healthyDomains = domains.filter(
    (domain) => normalize(domain.overall_status) === "healthy"
  ).length;

  const attentionDomains = domains.filter(
    (domain) => normalize(domain.overall_status) === "attention"
  ).length;

  const unknownDomains =
    domains.length - healthyDomains - attentionDomains;

  const criticalIssues = openIssues.filter(
    (issue) => issue.severity === "Critical"
  ).length;

  const warningIssues = openIssues.filter(
    (issue) => issue.severity === "Warning"
  ).length;

  const yesterday = Date.now() - 24 * 60 * 60 * 1000;

  const resolvedLast24Hours = issues.filter(
    (issue) =>
      issue.status === "Resolved" &&
      issue.resolved_at &&
      new Date(issue.resolved_at).getTime() >= yesterday
  ).length;

  const smartleadIntegrations = integrations.filter(
    (integration) => integration.provider === "smartlead"
  );

  let totalSmartleadAccounts = 0;
  let totalSmartleadActiveCampaigns = 0;

  const smartleadRows = smartleadIntegrations
    .map((integration, index) => {
      const integrationAccounts = accounts.filter(
        (account) => account.integration_id === integration.id
      ).length;

      const integrationCampaigns = mainCampaigns.filter(
        (campaign) =>
          campaign.integration_id === integration.id &&
          campaign.status?.toUpperCase() === "ACTIVE"
      ).length;

      totalSmartleadAccounts += integrationAccounts;
      totalSmartleadActiveCampaigns += integrationCampaigns;

      const isConnected = integration.status === "connected";
      const statusText = isConnected ? "● Active" : `● ${integration.status || "Sync"}`;
      const statusColor = isConnected ? "#10b981" : "#f59e0b";

      return `
        <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="${td()}">
            <strong style="color: #0f172a;">${escapeHtml(integration.name)}</strong>
          </td>
          <td style="${td()} text-align: center; font-weight: 700; color: #0f172a;">
            ${integrationAccounts.toLocaleString()}
          </td>
          <td style="${td()} text-align: center; font-weight: 700; color: #2563eb;">
            ${integrationCampaigns.toLocaleString()}
          </td>
          <td style="${td()} text-align: right; font-weight: 600; font-size: 11px; color: ${statusColor};">
            ${escapeHtml(statusText)}
          </td>
        </tr>
      `;
    })
    .join("");

  const smartleadTotalRow =
    smartleadIntegrations.length > 1
      ? `
        <tr style="background-color: #f1f5f9; font-weight: 700; border-top: 2px solid #e2e8f0;">
          <td style="${td()} color: #0f172a;">
            Total Smartlead Fleet
          </td>
          <td style="${td()} text-align: center; color: #0f172a;">
            ${totalSmartleadAccounts.toLocaleString()}
          </td>
          <td style="${td()} text-align: center; color: #2563eb;">
            ${totalSmartleadActiveCampaigns.toLocaleString()}
          </td>
          <td style="${td()} text-align: right; color: #64748b; font-size: 11px;">
            ${smartleadIntegrations.length} Workspaces
          </td>
        </tr>
      `
      : "";

  const emailGuardIntegrations = integrations.filter(
    (integration) => integration.provider === "emailguard"
  );

  const emailGuardRows = emailGuardIntegrations
    .map((integration, index) => {
      const integrationDomains = domains.filter(
        (domain) => domain.integration_id === integration.id
      );
      const domainCount = integrationDomains.length;
      const healthyCount = integrationDomains.filter(
        (d) => normalize(d.overall_status) === "healthy"
      ).length;
      const attentionCount = integrationDomains.filter(
        (d) => normalize(d.overall_status) === "attention"
      ).length;

      const isConnected = integration.status === "connected";
      const statusText = isConnected ? "● Active" : `● ${integration.status || "Sync"}`;
      const statusColor = isConnected ? "#10b981" : "#f59e0b";

      return `
        <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="${td()}">
            <strong style="color: #0f172a;">${escapeHtml(integration.name)}</strong>
          </td>
          <td style="${td()} text-align: center; font-weight: 700; color: #0f172a;">
            ${domainCount.toLocaleString()}
          </td>
          <td style="${td()} text-align: center; font-weight: 700; color: #10b981;">
            ${healthyCount.toLocaleString()}
          </td>
          <td style="${td()} text-align: center; font-weight: 700; color: ${attentionCount > 0 ? "#ef4444" : "#64748b"};">
            ${attentionCount.toLocaleString()}
          </td>
          <td style="${td()} text-align: right; font-weight: 600; font-size: 11px; color: ${statusColor};">
            ${escapeHtml(statusText)}
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
                            Smartlead Workspaces (${smartleadIntegrations.length})
                          </h2>

                          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px; margin-bottom: 20px;">
                            <table style="${table()}">
                              <thead>
                                <tr>
                                  <th style="${th()}">Workspace</th>
                                  <th style="${th()} text-align: center;">Accounts</th>
                                  <th style="${th()} text-align: center;">Active Campaigns</th>
                                  <th style="${th()} text-align: right;">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${smartleadRows}
                                ${smartleadTotalRow}
                              </tbody>
                            </table>
                          </div>
                        `
                        : ""
                    }

                    ${
                      emailGuardIntegrations.length > 0
                        ? `
                          <h2 style="${heading()}">
                            EmailGuard DNS Workspaces (${emailGuardIntegrations.length})
                          </h2>

                          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px; margin-bottom: 20px;">
                            <table style="${table()}">
                              <thead>
                                <tr>
                                  <th style="${th()}">Workspace</th>
                                  <th style="${th()} text-align: center;">Total Domains</th>
                                  <th style="${th()} text-align: center;">Healthy</th>
                                  <th style="${th()} text-align: center;">Need Attention</th>
                                  <th style="${th()} text-align: right;">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${emailGuardRows}
                              </tbody>
                            </table>
                          </div>
                        `
                        : `
                          <h2 style="${heading()}">
                            EmailGuard DNS Workspaces
                          </h2>

                          <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px 16px; background-color: #f8fafc; margin-top: 8px; margin-bottom: 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="font-size: 13px; color: #475569; line-height: 1.5;">
                                  <span style="display: inline-block; background-color: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-right: 6px; text-transform: uppercase;">
                                    Not Connected
                                  </span>
                                  <strong>EmailGuard:</strong> No workspace connected yet.
                                  <div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">
                                    Connect your EmailGuard API key in Settings &rarr; Connections to automatically monitor domain SPF, DKIM, DMARC records, and deliverability status in this daily report.
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </div>
                        `
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
                                <td>Accounts inspected: <strong style="color: #0f172a;">${Math.max(scanSummary.accountsChecked || 0, totalAccounts).toLocaleString()}</strong></td>
                                <td>Domains verified: <strong style="color: #0f172a;">${Math.max(scanSummary.domainsChecked || 0, domains.length).toLocaleString()}</strong></td>
                                <td>New issues logged: <strong style="color: #0f172a;">${(scanSummary.newIssues ?? 0).toLocaleString()}</strong></td>
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