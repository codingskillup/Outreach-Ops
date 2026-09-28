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
        resolved_at
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
  ]);

  return (
    <IssuesPageClient
      realIssues={
        issuesResult.data ||
        []
      }
      hasLiveData={
        (accountsResult.count ||
          0) > 0
      }
    />
  );
}