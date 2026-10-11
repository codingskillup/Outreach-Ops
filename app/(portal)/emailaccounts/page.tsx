import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import EmailAccountsPageClient, {
  type EmailAccountRule,
  type RealAccount,
} from "@/components/EmailAccountsPageClient";

const PAGE_SIZE = 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type RawData = Record<string, unknown>;

function pruneEmailAccountRawData(rawData: unknown): RawData | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const raw = rawData as RawData;
  const warmup =
    raw.warmup_details &&
    typeof raw.warmup_details === "object" &&
    !Array.isArray(raw.warmup_details)
      ? (raw.warmup_details as RawData)
      : null;

  return {
    from_name: raw.from_name ?? null,
    client_name: raw.client_name ?? raw.clientName ?? raw.client ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    message_per_day: raw.message_per_day ?? null,
    minTimeToWaitInMins: raw.minTimeToWaitInMins ?? null,
    warmup_details: warmup
      ? {
          status: warmup.status ?? null,
          max_email_per_day:
            warmup.max_email_per_day ?? warmup.warmup_max_count ?? null,
          warmup_max_count:
            warmup.warmup_max_count ?? warmup.max_email_per_day ?? null,
          warmup_reputation: warmup.warmup_reputation ?? null,
          reply_rate: warmup.reply_rate ?? null,
        }
      : null,
    warmup_reputation: raw.warmup_reputation ?? null,
    bounce_rate: raw.bounce_rate ?? null,
  };
}

async function fetchEmailAccountsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number,
  withCount = false
) {
  const { data, count, error } = await supabase
    .from("email_accounts")
    .select(
      "id,external_id,email,from_name,username,account_type,raw_data,synced_at,integration_id,integrations(id,name,provider)",
      withCount ? { count: "exact" } : undefined
    )
    .eq("user_id", userId)
    .order("email", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return { data: (data || []) as RealAccount[], count };
}

async function getAllEmailAccountsFast(
  supabase: SupabaseServerClient,
  userId: string
): Promise<RealAccount[]> {
  const firstPage = await fetchEmailAccountsPage(supabase, userId, 0, PAGE_SIZE - 1, true);
  const rows: RealAccount[] = [...firstPage.data];
  const total = firstPage.count ?? rows.length;

  if (total <= PAGE_SIZE || rows.length < PAGE_SIZE) {
    return rows;
  }

  const numPages = Math.ceil(total / PAGE_SIZE);
  const remainingPromises: Promise<{ data: RealAccount[] }>[] = [];

  for (let i = 1; i < numPages; i++) {
    const from = i * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    remainingPromises.push(
      fetchEmailAccountsPage(supabase, userId, from, to, false)
    );
  }

  const remainingPages = await Promise.all(remainingPromises);
  for (const page of remainingPages) {
    rows.push(...page.data);
  }

  return rows;
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

  let accounts: RealAccount[] = [];
  let rules: EmailAccountRule[] = [];

  try {
    const [rawAccounts, fetchedRules] = await Promise.all([
      getAllEmailAccountsFast(supabase, user.id),
      getAccountRules(supabase, user.id),
    ]);

    accounts = rawAccounts.map((account) => ({
      ...account,
      raw_data: pruneEmailAccountRawData(account.raw_data),
    }));
    rules = fetchedRules;
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

