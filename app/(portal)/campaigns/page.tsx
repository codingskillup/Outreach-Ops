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

async function fetchAccountsPage(
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
      .from("email_accounts")
      .select(`
        id,
        raw_data
      `)
      .eq(
        "user_id",
        userId
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
    const to =
      from +
      PAGE_SIZE -
      1;

    const page =
      await fetchPage(
        from,
        to
      );

    rows.push(
      ...page
    );

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;

    if (
      from >
      100000
    ) {
      throw new Error(
        "Campaign pagination safety limit reached."
      );
    }
  }

  return rows;
}

function asObject(
  value: unknown
): RawData {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as RawData;
  }

  return {};
}

function getText(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const text =
    value.trim();

  return text || null;
}

function getId(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id =
    String(value).trim();

  return id || null;
}

function isMainCampaign(
  rawData: unknown
) {
  const raw =
    asObject(rawData);

  const parentId =
    raw.parent_campaign_id;

  return (
    parentId === null ||
    parentId === undefined ||
    parentId === ""
  );
}

function buildClientNamesById(
  accounts: {
    id: string;
    raw_data: unknown;
  }[]
) {
  const map:
    Record<string, string> = {};

  for (
    const account of accounts
  ) {
    const raw =
      asObject(
        account.raw_data
      );

    const clientId =
      getId(
        raw.client_id
      );

    const clientName =
      getText(
        raw.client_name
      ) ||
      getText(
        raw.clientName
      );

    if (
      clientId &&
      clientName
    ) {
      map[
        clientId
      ] =
        clientName;
    }
  }

  return map;
}

export default async function CampaignsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase
      .auth
      .getUser();

  if (!user) {
    return null;
  }

  let campaigns:
    Awaited<
      ReturnType<
        typeof fetchCampaignsPage
      >
    > = [];

  let accounts:
    Awaited<
      ReturnType<
        typeof fetchAccountsPage
      >
    > = [];

  try {
    [
      campaigns,
      accounts,
    ] =
      await Promise.all([
        loadAllRows(
          (from, to) =>
            fetchCampaignsPage(
              supabase,
              user.id,
              from,
              to
            )
        ),

        loadAllRows(
          (from, to) =>
            fetchAccountsPage(
              supabase,
              user.id,
              from,
              to
            )
        ),
      ]);
  } catch (error) {
    console.error(
      "Campaigns page error:",
      error
    );
  }

  /*
   * Smartlead API includes
   * child/subsequence campaigns.
   *
   * Smartlead's main Campaign UI
   * does not count these separately.
   *
   * 225 API campaigns
   * - 3 child campaigns
   * = 222 main campaigns.
   *
   * Nothing is deleted.
   */
  const mainCampaigns =
    campaigns.filter(
      (campaign) =>
        isMainCampaign(
          campaign.raw_data
        )
    );

  const clientNamesById =
    buildClientNamesById(
      accounts
    );

  return (
    <CampaignsPageClient
      realCampaigns={
        mainCampaigns
      }
      clientNamesById={
        clientNamesById
      }
    />
  );
}