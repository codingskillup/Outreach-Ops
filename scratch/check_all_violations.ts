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
  console.log("Fetching all accounts from Smartlead with pagination...");

  const allAccounts: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`https://server.smartlead.ai/api/v1/email-accounts/?api_key=${apiKey}&limit=${limit}&offset=${offset}`);
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    allAccounts.push(...page);
    console.log(`Fetched ${allAccounts.length} accounts so far...`);
    if (page.length < limit) break;
    offset += limit;
  }

  console.log(`Total accounts fetched: ${allAccounts.length}`);

  // Find accounts that violate rules
  // Hypertide Google: minWait 35, warmup ON
  // Hypertide Azure/Entra: minWait 60, warmup ON
  const violations: any[] = [];
  for (const acc of allAccounts) {
    const tag = acc.tags?.[0]?.tag_name;
    const wait = acc.minTimeToWaitInMins;
    const warmup = acc.warmup_details?.status;

    if (tag === "Hypertide Google") {
      if (wait !== 35) violations.push({ email: acc.from_email, type: "Minimum Gap", current: wait, expected: 35, tag });
      if (warmup !== "ACTIVE") violations.push({ email: acc.from_email, type: "Warmup", current: warmup, expected: "ACTIVE", tag });
    } else if (tag === "Hypertide Azure/Entra") {
      if (wait !== 60) violations.push({ email: acc.from_email, type: "Minimum Gap", current: wait, expected: 60, tag });
      if (warmup !== "ACTIVE") violations.push({ email: acc.from_email, type: "Warmup", current: warmup, expected: "ACTIVE", tag });
    }
  }

  console.log("Current violations in Smartlead:", violations);
}

main().catch(console.error);
