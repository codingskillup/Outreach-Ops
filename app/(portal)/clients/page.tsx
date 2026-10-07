import {
  createClient,
} from "@/lib/supabase/server";

import {
  accountRules,
  isAccountType,
} from "@/lib/accountRules";

import ClientsPageClient from "@/components/ClientsPageClient";

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
  account_type: string | null;
  raw_data: RawData | null;
};

type CampaignRow = {
  id: string;
  status: string | null;
  raw_data: RawData | null;
};

type IssueRow = {
  id: string;
  client: string | null;
  status: string;
};

type ClientSummary = {
  id: string;
  name: string;
  totalAccounts: number;
  azureEntra: number;
  hypertideGoogle: number;
  googleWorkspace: number;
  activeCampaigns: number;
  healthyAccounts: number;
  issues: number;
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
      name.trim() ||
      "Unassigned";

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
      };

    buckets.set(
      key,
      created
    );

    return created;
  }

  for (
    const account of accounts
  ) {
    const clientName =
      getClientName(
        account.raw_data
      );

    const client =
      ensureClient(
        clientName
      );

    client.totalAccounts +=
      1;

    if (
      account.account_type ===
      "Hypertide Azure/Entra"
    ) {
      client.azureEntra +=
        1;
    }

    if (
      account.account_type ===
      "Hypertide Google"
    ) {
      client.hypertideGoogle +=
        1;
    }

    if (
      account.account_type ===
      "Google Workspace"
    ) {
      client.googleWorkspace +=
        1;
    }

    if (
      isHealthyAccount(
        account
      )
    ) {
      client.healthyAccounts +=
        1;
    }
  }

  for (
    const campaign of campaigns
  ) {
    if (
      normalizeStatus(
        campaign.status
      ) !== "ACTIVE"
    ) {
      continue;
    }

    const clientName =
      getClientName(
        campaign.raw_data
      );

    const client =
      ensureClient(
        clientName
      );

    client.activeCampaigns +=
      1;
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
      getText(
        issue.client
      ) ||
      "Unassigned";

    const client =
      ensureClient(
        clientName
      );

    client.issues +=
      1;
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

function createClientId(
  value: string
) {
  const id =
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
    id ||
    "unassigned"
  );
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
