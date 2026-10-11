import {
  createClient,
} from "@/lib/supabase/server";

import CampaignsPageClient from "@/components/CampaignsPageClient";

const PAGE_SIZE = 1000;

type SupabaseServerClient =
  Awaited<
    ReturnType<typeof createClient>
  >;

type RawData =
  Record<string, unknown>;

async function fetchCampaignsPage(
  supabase: SupabaseServerClient,
  userId: string,
  from: number,
  to: number
) {
  const {
    data,
    error,
  } =
    await supabase
      .from("campaigns")
      .select(`
        id,
        external_id,
        name,
        status,
        first_seen_active_at,
        raw_data,
        synced_at,
        integration_id,
        integrations (
          id,
          name,
          provider
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .order(
        "name",
        {
          ascending: true,
        }
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .range(
        from,
        to
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data || [];
}

async function loadAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<T[]>
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const page = await fetchPage(from, to);
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;

    if (from > 100000) {
      throw new Error("Campaign pagination safety limit reached.");
    }
  }

  return rows;
}

function asObject(value: unknown): RawData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RawData;
  }
  return {};
}

function getText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text || null;
}

function getId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const id = String(value).trim();
  return id || null;
}

function isMainCampaign(rawData: unknown) {
  const raw = asObject(rawData);
  const parentId = raw.parent_campaign_id;
  return parentId === null || parentId === undefined || parentId === "";
}


async function fetchClientNameOverrides(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from("email_accounts")
      .select("raw_data->client_id, raw_data->client_name, raw_data->clientName")
      .eq("user_id", userId)
      .not("raw_data->client_id", "is", null)
      .limit(1000);

    for (const item of (data || []) as Record<string, unknown>[]) {
      const clientId = getId(item.client_id);
      const clientName = getText(item.client_name) || getText(item.clientName);
      if (clientId && clientName) {
        map[clientId] = clientName;
      }
    }
  } catch (err) {
    console.warn("Client overrides fetch error:", err);
  }
  return map;
}

function buildClientNamesFromCampaigns(campaigns: { raw_data: unknown }[]) {
  const map: Record<string, string> = {};
  for (const campaign of campaigns) {
    const raw = asObject(campaign.raw_data);
    const clientId = getId(raw.client_id) || getId(raw.clientId);
    const clientName =
      getText(raw.client_name) ||
      getText(raw.clientName) ||
      (typeof raw.client === "string" ? getText(raw.client) : null) ||
      (raw.client && typeof raw.client === "object"
        ? getText((raw.client as RawData).name) ||
          getText((raw.client as RawData).client_name)
        : null);

    if (clientId && clientName) {
      map[clientId] = clientName;
    }
  }
  return map;
}

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let campaigns: Awaited<ReturnType<typeof fetchCampaignsPage>> = [];
  let clientOverrides: Record<string, string> = {};

  try {
    [campaigns, clientOverrides] = await Promise.all([
      loadAllRows((from, to) =>
        fetchCampaignsPage(supabase, user.id, from, to)
      ),
      fetchClientNameOverrides(supabase, user.id),
    ]);
  } catch (error) {
    console.error("Campaigns page error:", error);
  }

  /*
   * Smartlead API includes child/subsequence campaigns.
   * Smartlead's main Campaign UI does not count these separately.
   * 225 API campaigns - 3 child campaigns = 222 main campaigns.
   * Nothing is deleted.
   */
  const mainCampaigns = campaigns.filter((campaign) =>
    isMainCampaign(campaign.raw_data)
  );

  const clientNamesById = {
    ...buildClientNamesFromCampaigns(campaigns),
    ...clientOverrides,
  };

  return (
    <CampaignsPageClient
      realCampaigns={mainCampaigns}
      clientNamesById={clientNamesById}
    />
  );
}