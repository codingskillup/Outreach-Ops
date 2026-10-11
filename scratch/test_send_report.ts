import { createAdminClient } from "../lib/supabase/admin";
import { sendDailyReport } from "../lib/email/dailyReport";

async function main() {
  const supabase = createAdminClient();

  const { data: userRecord } = await supabase.from("integrations").select("user_id").limit(1).single();
  const userId = userRecord?.user_id;
  if (!userId) {
    console.error("No user_id found");
    return;
  }

  console.log("Testing sendDailyReport data calculation with userId:", userId);

  // We can call sendDailyReport to verify it succeeds and returns accurate metrics
  const res = await sendDailyReport({
    supabase,
    userId,
    scanSummary: {
      accountsChecked: 2368,
      domainsChecked: 0,
      openIssues: 0,
      smartleadIssues: 0,
      emailGuardIssues: 0,
      critical: 0,
      warnings: 0,
      resolved: 4,
      newIssues: 0,
      alertSent: false,
      alertError: null,
    },
  });

  console.log("Daily report result:", res);
}

main().catch(console.error);
