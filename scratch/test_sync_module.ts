import { createAdminClient } from "../lib/supabase/admin";
import { decryptApiKey } from "../lib/integrationCrypto";
import { scanIssues } from "../lib/issues/scanIssues";

async function main() {
  const supabase = createAdminClient();

  const userId = "96855549-6fa5-4310-8b77-d6dc681eed4d";
  const integrationId = "5b43b5e9-5177-453f-bf0a-11366bb1d059"; // 1st Smartlead

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (error || !integration) {
    console.error("Integration not found:", error);
    return;
  }

  const apiKey = decryptApiKey(integration.encrypted_api_key);
  console.log("Fetching Smartlead email accounts...");

  const res = await fetch(`https://server.smartlead.ai/api/v1/email-accounts/?api_key=${apiKey}&limit=100&offset=0`);
  const accounts: any[] = await res.json();
  console.log(`Fetched ${accounts.length} accounts.`);

  const now = new Date().toISOString();

  const accountRows = accounts.map((account) => {
    const rawData = {
      ...account,
      client_name: account.client_name ?? null,
    };

    return {
      user_id: userId,
      integration_id: integrationId,
      external_id: account.id,
      email: account.from_email || account.email || account.username,
      from_name: account.from_name || null,
      username: account.username || null,
      raw_data: rawData,
      synced_at: now,
      updated_at: now,
    };
  });

  const { error: upsertErr } = await supabase
    .from("email_accounts")
    .upsert(accountRows, { onConflict: "integration_id,external_id" });

  if (upsertErr) {
    console.error("Upsert error:", upsertErr);
    return;
  }

  console.log("Upserted email accounts successfully. Updating last_synced_at...");
  await supabase
    .from("integrations")
    .update({ last_synced_at: now, status: "connected" })
    .eq("id", integrationId);

  console.log("Running scanIssues now...");
  const summary = await scanIssues({
    supabase,
    userId,
    sendAlerts: false, // Don't send real alerts in test
  });

  console.log("Scan summary:", summary);

  // Check the two accounts
  const { data: issues } = await supabase
    .from("issues")
    .select("id, title, status, severity, resource_identifier, updated_at")
    .in("resource_identifier", ["r.ganmukhi@bolaihealthtech.com", "rushi_g@bolaiinfo.com"]);

  console.log("Issues after sync and scan:");
  for (const iss of issues || []) {
    console.log(`- ${iss.resource_identifier}: ${iss.title} -> Status: ${iss.status}`);
  }
}

main().catch(console.error);
