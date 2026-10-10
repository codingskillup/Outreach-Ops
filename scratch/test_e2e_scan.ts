import { createAdminClient } from "../lib/supabase/admin";
import { syncAllUserIntegrations } from "../lib/sync/syncService";
import { scanIssues } from "../lib/issues/scanIssues";

async function main() {
  const supabase = createAdminClient();
  const userId = "96855549-6fa5-4310-8b77-d6dc681eed4d";

  console.log("1. Starting syncAllUserIntegrations...");
  const syncResults = await syncAllUserIntegrations(userId);
  console.log("Sync results:", JSON.stringify(syncResults, null, 2));

  console.log("2. Starting scanIssues...");
  const summary = await scanIssues({
    supabase,
    userId,
    sendAlerts: false,
  });
  console.log("Scan summary:", JSON.stringify(summary, null, 2));

  console.log("3. Fetching open issues from DB:");
  const { data: openIssues } = await supabase
    .from("issues")
    .select("id, item, issue_type, current_value, expected_value, status, severity")
    .eq("user_id", userId)
    .eq("status", "Open");

  console.log("Current Open Issues in DB:", openIssues);
}

main().catch(console.error);
