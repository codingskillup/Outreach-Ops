import { createClient } from "@/lib/supabase/server";
import EmailAccountsPageClient from "@/components/EmailAccountsPageClient";

export default async function EmailAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: accounts,
    error,
  } = await supabase
    .from("email_accounts")
    .select(`
      id,
      external_id,
      email,
      from_name,
      username,
      account_type,
      raw_data,
      synced_at,
      integration_id,
      integrations (
        id,
        name,
        provider
      )
    `)
    .eq("user_id", user.id)
    .order("email", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Email accounts error:",
      error
    );
  }

  return (
    <EmailAccountsPageClient
      realAccounts={accounts || []}
    />
  );
}