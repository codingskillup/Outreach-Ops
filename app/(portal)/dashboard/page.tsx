import {
  createClient,
} from "@/lib/supabase/server";

import DashboardShell from "@/components/DashboardShell";

const PAGE_SIZE = 1000;

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

type RawData = Record<string, unknown>;

function pruneAccountRawData(rawData: unknown): RawData | null {
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
    client_name: raw.client_name ?? raw.clientName ?? raw.client ?? null,
    account_type: raw.account_type ?? null,
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
          reply_rate: warmup.reply_rate ?? null,
        }
      : null,
  };
}

function pruneCampaignRawData(rawData: unknown): RawData | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }

  const raw = rawData as RawData;

  return {
    parent_campaign_id: raw.parent_campaign_id ?? null,
    client_name: raw.client_name ?? raw.clientName ?? raw.client ?? null,
  };
}

async function loadAllRowsFast<T>(
  fetchPage: (
    from: number,
    to: number,
    withCount?: boolean
  ) => Promise<{ data: T[]; count?: number | null }>
): Promise<T[]> {
  const firstPage = await fetchPage(0, PAGE_SIZE - 1, true);
  const rows: T[] = [...firstPage.data];
  const total = firstPage.count ?? rows.length;

  if (total <= PAGE_SIZE || rows.length < PAGE_SIZE) {
    return rows;
  }

  const numPages = Math.ceil(total / PAGE_SIZE);
  const remainingPromises: Promise<{ data: T[] }>[] = [];

  for (let i = 1; i < numPages; i++) {
    const from = i * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    remainingPromises.push(fetchPage(from, to, false));
  }

  const remainingPages = await Promise.all(remainingPromises);
  for (const page of remainingPages) {
    rows.push(...page.data);
  }

  return rows;
}

async function fetchAccountsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number,
  withCount = false
) {
  const { data, count, error } = await supabase
    .from("email_accounts")
    .select(
      "id,account_type,raw_data,integration_id",
      withCount ? { count: "exact" } : undefined
    )
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Dashboard accounts load failed: ${error.message}`);
  }

  return { data: data || [], count };
}

async function fetchCampaignsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number,
  withCount = false
) {
  const { data, count, error } = await supabase
    .from("campaigns")
    .select(
      "id,name,status,raw_data,integration_id",
      withCount ? { count: "exact" } : undefined
    )
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Dashboard campaigns load failed: ${error.message}`);
  }

  return { data: data || [], count };
}

async function fetchDomainsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number,
  withCount = false
) {
  const { data, count, error } = await supabase
    .from("domains")
    .select(
      "id,integration_id,overall_status",
      withCount ? { count: "exact" } : undefined
    )
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Dashboard domains load failed: ${error.message}`);
  }

  return { data: data || [], count };
}

async function fetchIssuesPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number,
  withCount = false
) {
  const { data, count, error } = await supabase
    .from("issues")
    .select(
      "id,source,client,issue_type,item,severity,status,first_seen_at,last_seen_at,resolved_at",
      withCount ? { count: "exact" } : undefined
    )
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Dashboard issues load failed: ${error.message}`);
  }

  return { data: data || [], count };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    integrationsResult,
    syncLogsResult,
    accountRulesResult,
  ] = await Promise.all([
    supabase
      .from("integrations")
      .select("id,name,provider,status,last_synced_at")
      .eq("user_id", user.id),

    supabase
      .from("sync_logs")
      .select(
        "id,integration_id,provider,accounts_fetched,campaigns_fetched,active_campaigns,domains_fetched,status,message,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("account_type_rules")
      .select(
        "id,integration_id,tag_key,tag_name,is_enabled,message_per_day,minimum_gap,warmup_enabled,warmup_daily,reply_rate"
      )
      .eq("user_id", user.id)
      .order("tag_name", { ascending: true }),
  ]);

  if (integrationsResult.error) {
    console.error("Dashboard integrations error:", integrationsResult.error);
  }

  if (syncLogsResult.error) {
    console.error("Dashboard sync logs error:", syncLogsResult.error);
  }

  if (accountRulesResult.error) {
    console.error("Dashboard account rules error:", accountRulesResult.error);
  }

  type EmailAccountItem = {
    id: string;
    account_type: string | null;
    raw_data: RawData | null;
    integration_id: string;
  };

  type CampaignItem = {
    id: string;
    name: string | null;
    status: string | null;
    raw_data: RawData | null;
    integration_id: string;
  };

  let emailAccounts: EmailAccountItem[] = [];
  let campaigns: CampaignItem[] = [];
  let domains: { id: string; integration_id: string; overall_status: string | null }[] = [];
  let issues: {
    id: string;
    source: string;
    client: string | null;
    issue_type: string;
    item: string;
    severity: string;
    status: string;
    first_seen_at: string;
    last_seen_at: string;
    resolved_at: string | null;
  }[] = [];

  try {
    const [rawAccounts, rawCampaigns, rawDomains, rawIssues] = await Promise.all([
      loadAllRowsFast((from, to, withCount) =>
        fetchAccountsPage(supabase, user.id, from, to, withCount)
      ),
      loadAllRowsFast((from, to, withCount) =>
        fetchCampaignsPage(supabase, user.id, from, to, withCount)
      ),
      loadAllRowsFast((from, to, withCount) =>
        fetchDomainsPage(supabase, user.id, from, to, withCount)
      ),
      loadAllRowsFast((from, to, withCount) =>
        fetchIssuesPage(supabase, user.id, from, to, withCount)
      ),
    ]);

    emailAccounts = rawAccounts.map((account) => ({
      ...account,
      raw_data: pruneAccountRawData(account.raw_data),
    }));

    campaigns = rawCampaigns.map((campaign) => ({
      ...campaign,
      raw_data: pruneCampaignRawData(campaign.raw_data),
    }));

    domains = rawDomains;
    issues = rawIssues;
  } catch (error) {
    console.error("Dashboard live data error:", error);
  }

  return (
    <DashboardShell
      liveData={{
        integrations: integrationsResult.data || [],
        emailAccounts,
        campaigns,
        domains,
        syncLogs: syncLogsResult.data || [],
        issues,
        accountRules: accountRulesResult.data || [],
      }}
    />
  );
}
