import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("id, name, provider, last_synced_at, status");
  
  console.log("Integrations:", integrations, intErr);

  const { data: accounts, error: accErr } = await supabase
    .from("email_accounts")
    .select("id, email, raw_data, synced_at")
    .in("email", ["r.ganmukhi@bolaihealthtech.com", "rushi_g@bolaiinfo.com"]);

  console.log("Accounts in DB:");
  for (const acc of accounts || []) {
    const raw = acc.raw_data as any;
    console.log(`- ${acc.email}: minTimeToWaitInMins = ${raw?.min_time_between_emails ?? raw?.minTimeToWaitInMins}, synced_at: ${acc.synced_at}`);
  }

  const { data: issues, error: issErr } = await supabase
    .from("issues")
    .select("id, title, status, severity, resource_identifier, created_at, updated_at")
    .in("resource_identifier", ["r.ganmukhi@bolaihealthtech.com", "rushi_g@bolaiinfo.com"]);

  console.log("Issues in DB:", issues);
}

main().catch(console.error);
