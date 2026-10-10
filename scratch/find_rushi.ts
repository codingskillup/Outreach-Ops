import { createAdminClient } from "../lib/supabase/admin";
import { decryptApiKey } from "../lib/integrationCrypto";

async function main() {
  const supabase = createAdminClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", "5b43b5e9-5177-453f-bf0a-11366bb1d059")
    .single();

  const apiKey = decryptApiKey(integration.encrypted_api_key);

  // Search or check which integration rushi_g belongs to
  const { data: acc } = await supabase
    .from("email_accounts")
    .select("integration_id, external_id, email")
    .eq("email", "rushi_g@bolaiinfo.com")
    .single();

  console.log("rushi_g in DB:", acc);

  // Fetch this specific account from Smartlead
  if (acc?.external_id) {
    const res = await fetch(`https://server.smartlead.ai/api/v1/email-accounts/${acc.external_id}?api_key=${apiKey}`);
    const data = await res.json();
    console.log("Account from Smartlead by ID:", {
      id: data.id,
      from_email: data.from_email,
      min_time_between_emails: data.min_time_between_emails,
      max_lead_per_day: data.max_lead_per_day,
      updated_at: data.updated_at
    });
  }
}

main().catch(console.error);
