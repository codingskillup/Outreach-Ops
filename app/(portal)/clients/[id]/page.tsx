import {
  createClient,
} from "@/lib/supabase/server";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

import ClientDetailPage, {
  type ClientDetailData,
} from "@/components/ClientDetailPage";

const PAGE_SIZE = 1000;

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

type RawData =
  Record<string, unknown>;

type EmailAccountRow = {
  id: string;
  email: string | null;
  account_type: string | null;
  raw_data: RawData | null;
};

type CampaignRow = {
  id: string;
  name: string | null;
  status: string | null;
  first_seen_active_at:
    | string
    | null;
  raw_data: RawData | null;
};

type IssueRow = {
  id: string;
  client: string | null;
  issue_type: string;
  item: string;
  severity: string;
  status: string;
  last_seen_at: string;
};

async function loadAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<T[]>
) {
  const rows: T[] = [];

  let from = 0;

  while (true) {
    const to =
      from +
      PAGE_SIZE -
      1;

    const page =
      await fetchPage(
        from,
        to
      );

    rows.push(
      ...page
    );

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;

    if (
      from >
      100000
    ) {
      throw new Error(
        "Client detail pagination safety limit reached."
      );
    }
  }

  return rows;
}

async function fetchAccountsPage(
  supabase:
    SupabaseServerClient,
  userId:
    string,
  from:
    number,
  to:
    number
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "email_accounts"
      )
      .select(`
        id,
        email,
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
        to
      );

  if (error) {
    throw new Error(
      `Email accounts load failed: ${error.message}`
    );
  }

  return (
    data || []
  ) as EmailAccountRow[];
}

async function fetchCampaignsPage(
  supabase:
    SupabaseServerClient,
  userId:
    string,
  from:
    number,
  to:
    number
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "campaigns"
      )
      .select(`
        id,
        name,
        status,
        first_seen_active_at,
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
        to
      );

  if (error) {
    throw new Error(
      `Campaigns load failed: ${error.message}`
    );
  }

  return (
    data || []
  ) as CampaignRow[];
}

async function fetchOpenIssuesPage(
  supabase:
    SupabaseServerClient,
  userId:
    string,
  from:
    number,
  to:
    number
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "issues"
      )
      .select(`
        id,
        client,
        issue_type,
        item,
        severity,
        status,
        last_seen_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "status",
        "Open"
      )
      .order(
        "last_seen_at",
        {
          ascending: false,
        }
      )
      .range(
        from,
        to
      );

  if (error) {
    throw new Error(
      `Issues load failed: ${error.message}`
    );
  }

  return (
    data || []
  ) as IssueRow[];
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase
      .auth
      .getUser();

  if (!user) {
    return null;
  }

  let accounts:
    EmailAccountRow[] = [];

  let campaigns:
    CampaignRow[] = [];

  let openIssues:
    IssueRow[] = [];

  try {
    [
      accounts,
      campaigns,
      openIssues,
    ] =
      await Promise.all([
        loadAllRows(
          (from, to) =>
            fetchAccountsPage(
              supabase,
              user.id,
              from,
              to
            )
        ),

        loadAllRows(
          (from, to) =>
            fetchCampaignsPage(
              supabase,
              user.id,
              from,
              to
            )
        ),

        loadAllRows(
          (from, to) =>
            fetchOpenIssuesPage(
              supabase,
              user.id,
              from,
              to
            )
        ),
      ]);
  } catch (error) {
    console.error(
      "Client detail live data error:",
      error
    );
  }

  const clientNames =
    new Map<
      string,
      string
    >();

  for (
    const account of accounts
  ) {
    const clientName =
      getClientName(
        account.raw_data
      );

    if (
      clientName !==
      "Unassigned"
    ) {
      clientNames.set(
        createClientId(
          clientName
        ),
        clientName
      );
    }
  }

  for (
    const campaign of campaigns
  ) {
    const clientName =
      getClientName(
        campaign.raw_data
      );

    if (
      clientName !==
      "Unassigned"
    ) {
      clientNames.set(
        createClientId(
          clientName
        ),
        clientName
      );
    }
  }

  const requestedClientName =
    clientNames.get(
      id
    );

  if (
    !requestedClientName
  ) {
    return (
      <div
        style={{
          background:
            "#FFFFFF",
          padding:
            30,
          borderRadius:
            14,
          border:
            "1px solid #E5E7EB",
        }}
      >
        Client not found.
      </div>
    );
  }

  const normalizedClientName =
    requestedClientName
      .trim()
      .toLowerCase();

  const clientAccounts =
    accounts.filter(
      (account) =>
        getClientName(
          account.raw_data
        )
          .trim()
          .toLowerCase() ===
        normalizedClientName
    );

  const clientCampaigns =
    campaigns.filter(
      (campaign) =>
        isMainCampaign(
          campaign.raw_data
        ) &&
        getClientName(
          campaign.raw_data
        )
          .trim()
          .toLowerCase() ===
        normalizedClientName
    );

  const clientEmails =
    new Set(
      clientAccounts
        .map(
          (account) =>
            account.email
              ?.trim()
              .toLowerCase()
        )
        .filter(
          (
            email
          ): email is string =>
            Boolean(
              email
            )
        )
    );

  const clientIssues =
    openIssues.filter(
      (issue) => {
        const issueClient =
          getText(
            issue.client
          )
            ?.toLowerCase();

        if (
          issueClient ===
          normalizedClientName
        ) {
          return true;
        }

        const item =
          issue.item
            ?.trim()
            .toLowerCase();

        return (
          !issueClient &&
          Boolean(
            item &&
            clientEmails.has(
              item
            )
          )
        );
      }
    );

  const healthyAccounts =
    clientAccounts.filter(
      isHealthyAccount
    ).length;

  const azureEntra =
    clientAccounts.filter(
      (account) =>
        account.account_type ===
        "Hypertide Azure/Entra"
    ).length;

  const hypertideGoogle =
    clientAccounts.filter(
      (account) =>
        account.account_type ===
        "Hypertide Google"
    ).length;

  const googleWorkspace =
    clientAccounts.filter(
      (account) =>
        account.account_type ===
        "Google Workspace"
    ).length;

  const activeCampaigns =
    clientCampaigns.filter(
      (campaign) =>
        normalizeStatus(
          campaign.status
        ) ===
        "ACTIVE"
    ).length;

  const client:
    ClientDetailData = {
      id,

      name:
        requestedClientName,

      totalAccounts:
        clientAccounts.length,

      healthyAccounts,

      issues:
        clientIssues.length,

      activeCampaigns,

      azureEntra,

      hypertideGoogle,

      googleWorkspace,

      campaigns:
        clientCampaigns
          .map(
            (campaign) => ({
              id:
                campaign.id,

              name:
                campaign.name ||
                "Untitled Campaign",

              status:
                normalizeStatus(
                  campaign.status
                ),

              accounts:
                getCampaignAccountCount(
                  campaign.raw_data
                ),

              activeSince:
                campaign
                  .first_seen_active_at
                  ? formatDateTime(
                      campaign
                        .first_seen_active_at
                    )
                  : "—",
            })
          )
          .sort(
            (a, b) => {
              if (
                a.status ===
                  "ACTIVE" &&
                b.status !==
                  "ACTIVE"
              ) {
                return -1;
              }

              if (
                b.status ===
                  "ACTIVE" &&
                a.status !==
                  "ACTIVE"
              ) {
                return 1;
              }

              return a.name
                .localeCompare(
                  b.name
                );
            }
          ),

      recentIssues:
        clientIssues
          .slice(
            0,
            20
          )
          .map(
            (issue) => ({
              id:
                issue.id,

              type:
                issue.issue_type,

              item:
                issue.item,

              severity:
                normalizeSeverity(
                  issue.severity
                ),
            })
          ),
    };

  return (
    <ClientDetailPage
      client={client}
    />
  );
}

function getClientName(
  rawData:
    | RawData
    | null
) {
  const raw =
    rawData || {};

  return (
    getText(
      raw.client_name
    ) ||
    getText(
      raw.clientName
    ) ||
    getText(
      raw.client
    ) ||
    "Unassigned"
  );
}

function createClientId(
  value: string
) {
  const slug =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    slug ||
    "unassigned"
  );
}

function isHealthyAccount(
  account:
    EmailAccountRow
) {
  if (
    !isAccountType(
      account.account_type
    )
  ) {
    return false;
  }

  const rules =
    accountRules[
      account.account_type
    ];

  const raw =
    account.raw_data ||
    {};

  const warmupDetails =
    asObject(
      raw.warmup_details
    );

  const dailyLimit =
    getNumber(
      raw.message_per_day
    );

  const minimumGap =
    getNumber(
      raw.minTimeToWaitInMins
    );

  const warmupEnabled =
    getWarmupEnabled(
      warmupDetails.status
    );

  const warmupDaily =
    getNumber(
      warmupDetails
        .max_email_per_day
    );

  const replyRate =
    getNumber(
      warmupDetails
        .reply_rate
    );

  if (
    dailyLimit === null ||
    minimumGap === null ||
    warmupEnabled ===
      null ||
    warmupDaily === null ||
    replyRate === null
  ) {
    return false;
  }

  return (
    dailyLimit ===
      rules.dailyLimit &&
    minimumGap ===
      rules.minimumGap &&
    warmupEnabled ===
      rules.warmupEnabled &&
    warmupDaily ===
      rules.warmupDaily &&
    replyRate ===
      rules.replyRate
  );
}

function getCampaignAccountCount(
  rawData:
    | RawData
    | null
) {
  const raw =
    rawData || {};

  const arrayKeys = [
    "email_account_ids",
    "emailAccountIds",
    "email_accounts",
    "emailAccounts",
    "sender_accounts",
    "senderAccounts",
  ];

  for (
    const key of
    arrayKeys
  ) {
    const value =
      raw[key];

    if (
      Array.isArray(value)
    ) {
      return value.length;
    }
  }

  const countKeys = [
    "email_account_count",
    "email_accounts_count",
    "account_count",
    "sender_count",
  ];

  for (
    const key of
    countKeys
  ) {
    const value =
      getNumber(
        raw[key]
      );

    if (
      value !== null
    ) {
      return value;
    }
  }

  return null;
}

function normalizeStatus(
  value:
    | string
    | null
) {
  return (
    value
      ?.trim()
      .toUpperCase() ||
    "UNKNOWN"
  );
}

function normalizeSeverity(
  value: string
) {
  const severity =
    value
      .trim()
      .toLowerCase();

  if (
    severity ===
    "critical"
  ) {
    return "Critical";
  }

  return "Warning";
}

function asObject(
  value: unknown
): RawData {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    return value as RawData;
  }

  return {};
}

function isMainCampaign(
  rawData: unknown
) {
  const raw =
    asObject(rawData);

  const parentId =
    raw.parent_campaign_id;

  return (
    parentId === null ||
    parentId === undefined ||
    parentId === ""
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

  const text =
    value.trim();

  return (
    text ||
    null
  );
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
    status ===
      "ACTIVE" ||
    status ===
      "ON" ||
    status ===
      "ENABLED" ||
    status ===
      "TRUE" ||
    status ===
      "1"
  ) {
    return true;
  }

  if (
    status ===
      "INACTIVE" ||
    status ===
      "OFF" ||
    status ===
      "DISABLED" ||
    status ===
      "FALSE" ||
    status ===
      "0"
  ) {
    return false;
  }

  return null;
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        "Asia/Karachi",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(date);
}