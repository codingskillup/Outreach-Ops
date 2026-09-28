import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    integrationsResult,
    accountsResult,
    campaignsResult,
    syncLogsResult,
    issuesResult,
  ] =
    await Promise.all([
      supabase
        .from("integrations")
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

      supabase
        .from("email_accounts")
        .select(`
          id,
          account_type,
          raw_data,
          integration_id
        `)
        .eq(
          "user_id",
          user.id
        ),

      supabase
        .from("campaigns")
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
        .from("sync_logs")
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
        .from("issues")
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

  return (
    <DashboardShell
      liveData={{
        integrations:
          integrationsResult.data ||
          [],

        emailAccounts:
          accountsResult.data ||
          [],

        campaigns:
          campaignsResult.data ||
          [],

        syncLogs:
          syncLogsResult.data ||
          [],

        issues:
          issuesResult.data ||
          [],
      }}
    />
  );
}