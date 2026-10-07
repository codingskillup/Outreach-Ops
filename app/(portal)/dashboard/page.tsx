import {
  createClient,
} from "@/lib/supabase/server";

import DashboardShell from "@/components/DashboardShell";

const PAGE_SIZE = 1000;

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

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
        "Dashboard pagination safety limit reached."
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
        account_type,
        raw_data,
        integration_id
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
      `Dashboard accounts load failed: ${error.message}`
    );
  }

  return data || [];
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
        raw_data,
        integration_id
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
      `Dashboard campaigns load failed: ${error.message}`
    );
  }

  return data || [];
}

async function fetchDomainsPage(
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
        "domains"
      )
      .select(`
        id,
        integration_id,
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
        to
      );

  if (error) {
    throw new Error(
      `Dashboard domains load failed: ${error.message}`
    );
  }

  return data || [];
}

async function fetchIssuesPage(
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
        source,
        client,
        issue_type,
        item,
        severity,
        status,
        first_seen_at,
        last_seen_at,
        resolved_at
      `)
      .eq(
        "user_id",
        userId
      )
      .order(
        "last_seen_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );

  if (error) {
    throw new Error(
      `Dashboard issues load failed: ${error.message}`
    );
  }

  return data || [];
}

export default async function DashboardPage() {
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

  const {
    data:
      integrations,
    error:
      integrationsError,
  } =
    await supabase
      .from(
        "integrations"
      )
      .select(`
        id,
        name,
        provider,
        status,
        last_synced_at
      `)
      .eq(
        "user_id",
        user.id
      );

  if (
    integrationsError
  ) {
    console.error(
      "Dashboard integrations error:",
      integrationsError
    );
  }

  const {
    data:
      syncLogs,
    error:
      syncLogsError,
  } =
    await supabase
      .from(
        "sync_logs"
      )
      .select(`
        id,
        integration_id,
        provider,
        accounts_fetched,
        campaigns_fetched,
        active_campaigns,
        domains_fetched,
        status,
        message,
        created_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(100);

  if (
    syncLogsError
  ) {
    console.error(
      "Dashboard sync logs error:",
      syncLogsError
    );
  }

  let emailAccounts:
    Awaited<
      ReturnType<
        typeof fetchAccountsPage
      >
    > = [];

  let campaigns:
    Awaited<
      ReturnType<
        typeof fetchCampaignsPage
      >
    > = [];

  let domains:
    Awaited<
      ReturnType<
        typeof fetchDomainsPage
      >
    > = [];

  let issues:
    Awaited<
      ReturnType<
        typeof fetchIssuesPage
      >
    > = [];

  try {
    [
      emailAccounts,
      campaigns,
      domains,
      issues,
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
            fetchDomainsPage(
              supabase,
              user.id,
              from,
              to
            )
        ),

        loadAllRows(
          (from, to) =>
            fetchIssuesPage(
              supabase,
              user.id,
              from,
              to
            )
        ),
      ]);
  } catch (error) {
    console.error(
      "Dashboard live data error:",
      error
    );
  }

  return (
    <DashboardShell
      liveData={{
        integrations:
          integrations || [],

        emailAccounts,

        campaigns,

        domains,

        syncLogs:
          syncLogs || [],

        issues,
      }}
    />
  );
}
