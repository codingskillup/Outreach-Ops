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

async function fetchEmailAccountsPage(
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
      error.message
    );
  }

  return data || [];
}

async function getAllEmailAccounts(
  supabase:
    SupabaseServerClient,

  userId:
    string
) {
  type EmailAccountRows =
    Awaited<
      ReturnType<
        typeof fetchEmailAccountsPage
      >
    >;

  const allAccounts:
    EmailAccountRows = [];

  let from = 0;

  while (true) {
    const to =
      from +
      PAGE_SIZE -
      1;

    const rows =
      await fetchEmailAccountsPage(
        supabase,
        userId,
        from,
        to
      );

    allAccounts.push(
      ...rows
    );

    if (
      rows.length <
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
        "Dashboard email account pagination safety limit reached."
      );
    }
  }

  return allAccounts;
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

  const [
    integrationsResult,
    accounts,
    campaignsResult,
    syncLogsResult,
    issuesResult,
  ] =
    await Promise.all([
      supabase
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
        ),

      getAllEmailAccounts(
        supabase,
        user.id
      ),

      supabase
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
          user.id
        ),

      supabase
        .from(
          "sync_logs"
        )
        .select(`
          id,
          provider,
          accounts_fetched,
          campaigns_fetched,
          active_campaigns,
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
        .limit(20),

      supabase
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
          user.id
        )
        .order(
          "last_seen_at",
          {
            ascending:
              false,
          }
        )
        .limit(50),
    ]);

  if (
    integrationsResult.error
  ) {
    console.error(
      "Dashboard integrations error:",
      integrationsResult.error
    );
  }

  if (
    campaignsResult.error
  ) {
    console.error(
      "Dashboard campaigns error:",
      campaignsResult.error
    );
  }

  if (
    syncLogsResult.error
  ) {
    console.error(
      "Dashboard sync logs error:",
      syncLogsResult.error
    );
  }

  if (
    issuesResult.error
  ) {
    console.error(
      "Dashboard issues error:",
      issuesResult.error
    );
  }

  return (
    <DashboardShell
      liveData={{
        integrations:
          integrationsResult
            .data || [],

        emailAccounts:
          accounts,

        campaigns:
          campaignsResult
            .data || [],

        syncLogs:
          syncLogsResult
            .data || [],

        issues:
          issuesResult
            .data || [],
      }}
    />
  );
}