import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import EmailAccountsPageClient, {
  type EmailAccountRule,
} from "@/components/EmailAccountsPageClient";

const PAGE_SIZE = 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchEmailAccountsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number
) {
  const { data, error } = await supabase
    .from("email_accounts")
    .select(
      "id,external_id,email,from_name,username,account_type,raw_data,synced_at,integration_id,integrations(id,name,provider)"
    )
    .eq("user_id", userId)
    .order("email", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function getAllEmailAccounts(
  supabase: SupabaseServerClient,
  userId: string
) {
  type EmailAccountRows = Awaited<
    ReturnType<typeof fetchEmailAccountsPage>
  >;

  const allAccounts: EmailAccountRows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const rows = await fetchEmailAccountsPage(
      supabase,
      userId,
      from,
      to
    );

    allAccounts.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;

    if (from > 100000) {
      throw new Error(
        "Email account pagination safety limit reached."
      );
    }
  }

  return allAccounts;
}

async function getAccountRules(
  supabase: SupabaseServerClient,
  userId: string
): Promise<EmailAccountRule[]> {
  const { data, error } = await supabase
    .from("account_type_rules")
    .select(
      "id,integration_id,tag_key,tag_name,is_enabled,message_per_day,minimum_gap,warmup_enabled,warmup_daily,reply_rate"
    )
    .eq("user_id", userId)
    .order("tag_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as EmailAccountRule[];
}

export default async function EmailAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let accounts: Awaited<
    ReturnType<typeof getAllEmailAccounts>
  > = [];

  let rules: EmailAccountRule[] = [];

  try {
    [accounts, rules] = await Promise.all([
      getAllEmailAccounts(supabase, user.id),
      getAccountRules(supabase, user.id),
    ]);
  } catch (error) {
    console.error("Email accounts error:", error);
  }

  return (
    <EmailAccountsPageClient
      realAccounts={accounts}
      rules={rules}
    />
  );
}
