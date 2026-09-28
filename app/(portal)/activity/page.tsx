import { createClient } from "@/lib/supabase/server";
import ActivityPageClient from "@/components/ActivityPageClient";

export default async function ActivityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    syncLogsResult,
    issuesResult,
  ] = await Promise.all([
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
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),

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
      .eq("user_id", user.id)
      .order("last_seen_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  return (
    <ActivityPageClient
      syncLogs={
        syncLogsResult.data || []
      }
      issues={
        issuesResult.data || []
      }
    />
  );
}