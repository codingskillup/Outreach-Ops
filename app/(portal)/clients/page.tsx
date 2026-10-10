import {
  createClient,
} from "@/lib/supabase/server";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

import {
  cleanClientName,
  createClientId,
} from "@/lib/utils";

import ClientsPageClient, {
  type ClientSummary,
  type ClientIntegrationBreakdown,
} from "@/components/ClientsPageClient";

const PAGE_SIZE = 1000;

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

type RawData =
  Record<string, unknown>;

type IntegrationRelation = {
  id: string;
  name: string;
};

type EmailAccountRow = {
  id: string;
  account_type: string | null;
  integration_id: string | null;
  integrations:
    | IntegrationRelation
    | IntegrationRelation[]
    | null;
  raw_data: RawData | null;
};

type CampaignRow = {
  id: string;
  status: string | null;
  integration_id?: string | null;
  integrations?:
    | IntegrationRelation
    | IntegrationRelation[]
    | null;
  raw_data: RawData | null;
};

type IssueRow = {
  id: string;
  client: string | null;
  source?: string | null;
  status: string;
};

async function fetchAccountsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number
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
        account_type,
        integration_id,
        integrations (
          id,
          name
        ),
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
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number
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
        status,
        integration_id,
        integrations (
          id,
          name
        ),
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
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number
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
        source,
        status
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
      `Issues load failed: ${error.message}`
    );
  }

  return (
    data || []
  ) as IssueRow[];
}

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
        "Clients pagination safety limit reached."
      );
    }
  }

  return rows;
}

export default async function ClientsPage() {
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
      "Clients page live data error:",
      error
    );
  }

  const clients =
    buildClientSummaries(
      accounts,
      campaigns,
      openIssues
    );

  return (
    <ClientsPageClient
      clients={clients}
    />
  );
}

function buildClientSummaries(
  accounts: EmailAccountRow[],
  campaigns: CampaignRow[],
  openIssues: IssueRow[]
) {
  const buckets =
    new Map<
      string,
      ClientSummary
    >();

  function ensureClient(
    name: string
  ) {
    const cleanedName =
      cleanClientName(name);

    const key =
      cleanedName.toLowerCase();

    const existing =
      buckets.get(key);

    if (existing) {
      return existing;
    }

    const created:
      ClientSummary = {
        id:
          createClientId(
            cleanedName
          ),

        name:
          cleanedName,

        totalAccounts:
          0,

        azureEntra:
          0,

        hypertideGoogle:
          0,

        googleWorkspace:
          0,

        activeCampaigns:
          0,

        healthyAccounts:
          0,

        issues:
          0,

        integrations:
          [],
      };

    buckets.set(
      key,
      created
    );

    return created;
  }

  function ensureIntegration(
    client: ClientSummary,
    intName: string
  ): ClientIntegrationBreakdown {
    let existingInt = client.integrations.find(
      (i) => i.name === intName
    );

    if (!existingInt) {
      existingInt = {
        name: intName,
        count: 0,
        azureEntra: 0,
        hypertideGoogle: 0,
        googleWorkspace: 0,
        activeCampaigns: 0,
        healthyAccounts: 0,
        issues: 0,
      };
      client.integrations.push(existingInt);
    }

    return existingInt;
  }

  for (
    const account of accounts
  ) {
    const clientName =
      cleanClientName(
        getClientName(
          account.raw_data
        )
      );

    const client =
      ensureClient(
        clientName
      );

    client.totalAccounts +=
      1;

    const intName =
      getIntegrationName(
        account
      );

    const clientInt =
      ensureIntegration(
        client,
        intName
      );

    clientInt.count += 1;

    if (
      account.account_type ===
      "Hypertide Azure/Entra"
    ) {
      client.azureEntra +=
        1;
      clientInt.azureEntra += 1;
    }

    if (
      account.account_type ===
      "Hypertide Google"
    ) {
      client.hypertideGoogle +=
        1;
      clientInt.hypertideGoogle += 1;
    }

    if (
      account.account_type ===
      "Google Workspace"
    ) {
      client.googleWorkspace +=
        1;
      clientInt.googleWorkspace += 1;
    }

    if (
      isHealthyAccount(
        account
      )
    ) {
      client.healthyAccounts +=
        1;
      clientInt.healthyAccounts += 1;
    }
  }

  // Sort integrations for each client (e.g. 1st Smartlead, 2nd Smartlead)
  for (const client of buckets.values()) {
    client.integrations.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  for (
    const campaign of campaigns
  ) {
    if (
      !isMainCampaign(
        campaign.raw_data
      )
    ) {
      continue;
    }

    if (
      normalizeStatus(
        campaign.status
      ) !== "ACTIVE"
    ) {
      continue;
    }

    const clientName =
      cleanClientName(
        getClientName(
          campaign.raw_data
        )
      );

    const client =
      ensureClient(
        clientName
      );

    client.activeCampaigns +=
      1;

    const intName =
      getIntegrationName(
        campaign
      );

    if (intName && intName !== "Unknown Integration") {
      const clientInt = ensureIntegration(client, intName);
      clientInt.activeCampaigns += 1;
    }
  }

  for (
    const issue of openIssues
  ) {
    if (
      issue.status !==
      "Open"
    ) {
      continue;
    }

    const clientName =
      cleanClientName(
        getText(
          issue.client
        ) ||
        "Unassigned"
      );

    const client =
      ensureClient(
        clientName
      );

    client.issues +=
      1;

    const issueSource = getText(issue.source);
    if (issueSource) {
      const clientInt = client.integrations.find(
        (i) => i.name === issueSource
      );
      if (clientInt) {
        clientInt.issues += 1;
      }
    }
  }

  return Array.from(
    buckets.values()
  ).sort(
    (a, b) => {
      if (
        a.name ===
          "Unassigned" &&
        b.name !==
          "Unassigned"
      ) {
        return 1;
      }

      if (
        b.name ===
          "Unassigned" &&
        a.name !==
          "Unassigned"
      ) {
        return -1;
      }

      if (
        b.totalAccounts !==
        a.totalAccounts
      ) {
        return (
          b.totalAccounts -
          a.totalAccounts
        );
      }

      return a.name.localeCompare(
        b.name
      );
    }
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

function isHealthyAccount(
  account: EmailAccountRow
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
    account.raw_data || {};

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

function getIntegrationName(
  account: EmailAccountRow | CampaignRow
): string {
  if (account.integrations) {
    if (Array.isArray(account.integrations)) {
      if (account.integrations[0]?.name) {
        return account.integrations[0].name;
      }
    } else if (account.integrations.name) {
      return account.integrations.name;
    }
  }

  return "Unknown Integration";
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
