import { createAdminClient } from "../lib/supabase/admin";
import { decryptApiKey } from "../lib/integrationCrypto";
import { scanIssues } from "../lib/issues/scanIssues";

async function main() {
  const supabase = createAdminClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", "5b43b5e9-5177-453f-bf0a-11366bb1d059")
    .single();

  if (error || !integration) {
    console.error("Integration not found:", error);
    return;
  }

  const apiKey = decryptApiKey(integration.encrypted_api_key);
  console.log("Decrypted API key successfully. Fetching Smartlead email accounts...");

  const res = await fetch(`https://server.smartlead.ai/api/v1/email-accounts/?api_key=${apiKey}&limit=100&offset=0`);
  const accounts = await res.json();
  console.log(`Fetched ${accounts.length} accounts from Smartlead.`);

  const rGanmukhi = accounts.find((a: any) => a.from_email === "r.ganmukhi@bolaihealthtech.com" || a.email === "r.ganmukhi@bolaihealthtech.com");
  const rushiG = accounts.find((a: any) => a.from_email === "rushi_g@bolaiinfo.com" || a.email === "rushi_g@bolaiinfo.com");

  console.log("Live Smartlead values:");
  console.log("r.ganmukhi minTimeToWaitInMins:", rGanmukhi?.min_time_between_emails ?? rGanmukhi?.minTimeToWaitInMins);
  console.log("rushi_g minTimeToWaitInMins:", rushiG?.min_time_between_emails ?? rushiG?.minTimeToWaitInMins);
}

main().catch(console.error);
