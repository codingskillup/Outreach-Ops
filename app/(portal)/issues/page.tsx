import { createClient } from "@/lib/supabase/server";
import IssuesPageClient from "@/components/IssuesPageClient";

export default async function IssuesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    issuesResult,
    accountsResult,
    integrationsResult,
  ] = await Promise.all([
    supabase
      .from("issues")
      .select(`
        id,
        source,
        client,
        issue_type,
        item,
        account_type,
        current_value,
        expected_value,
        severity,
        status,
        first_seen_at,
        last_seen_at,
        resolved_at,
        integration_id,
        integrations (
          id,
          name,
          provider
        )
      `)
      .eq(
        "user_id",
        user.id
      )
      .order(
        "last_seen_at",
        {
          ascending: false,
        }
      ),

    supabase
      .from("email_accounts")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "user_id",
        user.id
      ),

    supabase
      .from("integrations")
      .select("id, name, provider")
      .eq("user_id", user.id),
  ]);

  const integrationMap = new Map<string, string>();
  for (const int of integrationsResult.data || []) {
    if (int.id && int.name) {
      integrationMap.set(int.id, int.name);
    }
  }

  const enrichedIssues = (issuesResult.data || []).map((issue) => {
    let integrationName = "";
    const rawIntegrations = issue.integrations as unknown;
    if (rawIntegrations) {
      if (Array.isArray(rawIntegrations)) {
        integrationName = String((rawIntegrations[0] as { name?: string })?.name || "");
      } else if (typeof rawIntegrations === "object" && rawIntegrations !== null) {
        integrationName = String((rawIntegrations as { name?: string }).name || "");
      }
    }

    if (!integrationName && issue.integration_id) {
      integrationName = integrationMap.get(issue.integration_id) || "";
    }

    return {
      ...issue,
      integration_name: integrationName || issue.source || "Smartlead",
    };
  });

  return (
    <IssuesPageClient
      realIssues={enrichedIssues}
      hasLiveData={
        (accountsResult.count ||
          0) > 0
      }
    />
  );
}