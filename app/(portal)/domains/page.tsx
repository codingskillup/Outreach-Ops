import { createClient } from "@/lib/supabase/server";
import DomainsPageClient from "@/components/DomainsPageClient";

export default async function DomainsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: domains,
    error,
  } =
    await supabase
      .from("domains")
      .select(`
        id,
        domain,
        client,
        spf_status,
        dkim_status,
        dmarc_status,
        dmarc_policy,
        reporting_status,
        overall_status,
        synced_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .order(
        "domain",
        {
          ascending: true,
        }
      );

  if (error) {
    console.error(
      "Domains error:",
      error
    );
  }

  return (
    <DomainsPageClient
      realDomains={
        domains || []
      }
    />
  );
}