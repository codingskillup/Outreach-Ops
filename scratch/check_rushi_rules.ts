import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: rules } = await supabase
    .from("account_type_rules")
    .select("*");

  console.log("Rules in DB:", JSON.stringify(rules, null, 2));

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("email", "rushi_g@bolaiinfo.com")
    .single();

  console.log("rushi_g account in DB:", {
    email: account?.email,
    account_type: account?.account_type,
    raw_data: {
      tags: account?.raw_data?.tags,
      minTimeToWaitInMins: account?.raw_data?.minTimeToWaitInMins,
      min_time_between_emails: account?.raw_data?.min_time_between_emails,
      max_lead_per_day: account?.raw_data?.max_lead_per_day,
      max_leads_per_day: account?.raw_data?.max_leads_per_day,
    }
  });
}

main().catch(console.error);
