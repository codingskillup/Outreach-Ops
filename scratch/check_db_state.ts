import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: integrations, error: intErr } = await supabase
    .from("integrations")
    .select("*");
  
  console.log("All Integrations:", integrations);

  const { count: domainCount, data: domains } = await supabase
    .from("domains")
    .select("*", { count: "exact" })
    .limit(5);

  console.log(`Domains in DB (total: ${domainCount}):`, domains);
}

main().catch(console.error);
