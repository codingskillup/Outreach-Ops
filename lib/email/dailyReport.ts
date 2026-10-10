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
      <div
        style="
          max-width: 850px;
          margin: 0 auto;
          padding: 28px;
          font-family: Arial, sans-serif;
          color: #111827;
        "
      >
        <h1
          style="
            margin: 0;
            font-size: 26px;
          "
        >
          Outreach Ops Daily Report
        </h1>

        <p
          style="
            margin-top: 8px;
            color: #6b7280;
          "
        >
          ${reportDate}
        </p>

        <h2 style="${heading()}">
          Email Accounts
        </h2>

        ${metricTable([
          [
            "Total Accounts",
            totalAccounts,
          ],
          [
            "Healthy",
            healthyAccounts,
          ],
          [
            "Need Attention",
            accountsAttention,
          ],
          [
            "Active Campaigns",
            activeCampaigns,
          ],
        ])}

        <h2 style="${heading()}">
          Domains
        </h2>

        ${metricTable([
          [
            "Total Domains",
            domains.length,
          ],
          [
            "Healthy",
            healthyDomains,
          ],
          [
            "Need Attention",
            attentionDomains,
          ],
          [
            "Unknown",
            unknownDomains,
          ],
        ])}

        <h2 style="${heading()}">
          Issues
        </h2>

        ${metricTable([
          [
            "Open Issues",
            openIssues.length,
          ],
          [
            "Critical",
            criticalIssues,
          ],
          [
            "Warnings",
            warningIssues,
          ],
          [
            "New Issues",
            scanSummary?.newIssues ?? 0,
          ],
          [
            "Resolved Last 24 Hours",
            resolvedLast24Hours,
          ],
        ])}

        ${
          smartleadRows
            ? `
              <h2 style="${heading()}">
                Smartlead
              </h2>

              <table style="${table()}">
                <thead>
                  <tr>
                    <th style="${th()}">
                      Connection
                    </th>

                    <th style="${th()}">
                      Accounts
                    </th>

                    <th style="${th()}">
                      Active Campaigns
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${smartleadRows}
                </tbody>
              </table>
            `
            : ""
        }

        ${
          emailGuardRows
            ? `
              <h2 style="${heading()}">
                EmailGuard
              </h2>

              <table style="${table()}">
                <thead>
                  <tr>
                    <th style="${th()}">
                      Connection
                    </th>

                    <th style="${th()}">
                      Domains
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${emailGuardRows}
                </tbody>
              </table>
            `
            : ""
        }

        <div
          style="
            margin-top: 28px;
            padding: 16px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
          "
        >
          <strong>
            Latest automatic scan
          </strong>

          <p
            style="
              margin: 8px 0 0;
              color: #6b7280;
            "
          >
            Accounts checked:
            ${scanSummary.accountsChecked.toLocaleString()}
            <br />

            Domains checked:
            ${scanSummary.domainsChecked.toLocaleString()}
            <br />

            New issues:
            ${scanSummary.newIssues.toLocaleString()}
          </p>
        </div>

        <p
          style="
            margin-top: 28px;
            color: #9ca3af;
            font-size: 12px;
          "
        >
          Generated automatically by Outreach Ops.
        </p>
      </div>
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
    <table style="${table()}">
      <tbody>
        ${metrics
          .map(
            ([
              label,
              value,
            ]) => `
              <tr>
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
  `;
}

function table() {
  return `
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  `;
}

function heading() {
  return `
    margin-top: 30px;
    margin-bottom: 10px;
    font-size: 18px;
  `;
}

function th() {
  return `
    padding: 10px 12px;
    text-align: left;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    font-size: 13px;
  `;
}

function td() {
  return `
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    font-size: 14px;
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