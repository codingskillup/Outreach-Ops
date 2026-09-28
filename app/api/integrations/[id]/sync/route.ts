import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/integrationCrypto";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JsonObject = Record<
  string,
  unknown
>;

function sleep(ms: number) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

function asObject(
  value: unknown
): JsonObject {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

function getArray(
  value: unknown
): JsonObject[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          item &&
          typeof item === "object"
      )
      .map(
        (item) =>
          item as JsonObject
      );
  }

  const object =
    asObject(value);

  if (
    Array.isArray(
      object.data
    )
  ) {
    return object.data
      .filter(
        (item) =>
          item &&
          typeof item === "object"
      )
      .map(
        (item) =>
          item as JsonObject
      );
  }

  return [];
}

function getString(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const result =
    String(value).trim();

  return result || null;
}

function getNumber(
  value: unknown
) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return null;
  }

  return number;
}

async function fetchJsonWithRetry(
  url: string
) {
  let lastStatus = 0;

  for (
    let attempt = 0;
    attempt < 4;
    attempt++
  ) {
    const response =
      await fetch(url, {
        method: "GET",

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            25000
          ),
      });

    lastStatus =
      response.status;

    if (response.ok) {
      return response.json();
    }

    if (
      response.status !== 429 &&
      response.status < 500
    ) {
      const body =
        await response.text();

      throw new Error(
        `Smartlead request failed with ${response.status}: ${body.slice(
          0,
          200
        )}`
      );
    }

    const delay =
      1000 *
      Math.pow(
        2,
        attempt
      );

    await sleep(delay);
  }

  throw new Error(
    `Smartlead request failed after retries. Last status: ${lastStatus}`
  );
}

async function fetchAllEmailAccounts(
  apiKey: string
) {
  const allAccounts:
    JsonObject[] = [];

  const limit = 100;

  let offset = 0;

  while (true) {
    const url =
      new URL(
        "https://server.smartlead.ai/api/v1/email-accounts/"
      );

    url.searchParams.set(
      "api_key",
      apiKey
    );

    url.searchParams.set(
      "offset",
      String(offset)
    );

    url.searchParams.set(
      "limit",
      String(limit)
    );

    const json =
      await fetchJsonWithRetry(
        url.toString()
      );

    const page =
      getArray(json);

    allAccounts.push(
      ...page
    );

    if (
      page.length <
      limit
    ) {
      break;
    }

    offset += limit;

    if (
      offset > 50000
    ) {
      throw new Error(
        "Smartlead pagination safety limit reached."
      );
    }
  }

  return allAccounts;
}

async function fetchCampaigns(
  apiKey: string
) {
  const url =
    new URL(
      "https://server.smartlead.ai/api/v1/campaigns/"
    );

  url.searchParams.set(
    "api_key",
    apiKey
  );

  url.searchParams.set(
    "include_tags",
    "true"
  );

  const json =
    await fetchJsonWithRetry(
      url.toString()
    );

  return getArray(json);
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const supabase =
    await createClient();

  let integrationId =
    "";

  let userId =
    "";

  try {
    const { id } =
      await context.params;

    integrationId =
      id;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    userId =
      user.id;

    const {
      data: integration,
      error:
        integrationError,
    } =
      await supabase
        .from(
          "integrations"
        )
        .select(`
          id,
          user_id,
          provider,
          encrypted_api_key
        `)
        .eq(
          "id",
          integrationId
        )
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      integrationError ||
      !integration
    ) {
      return NextResponse.json(
        {
          error:
            "Connection not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      integration.provider !==
      "smartlead"
    ) {
      return NextResponse.json(
        {
          error:
            "Smartlead sync is only available for Smartlead connections.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !integration
        .encrypted_api_key
    ) {
      return NextResponse.json(
        {
          error:
            "Encrypted API key is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      decryptApiKey(
        integration
          .encrypted_api_key
      );

    const [
      accounts,
      campaigns,
    ] =
      await Promise.all([
        fetchAllEmailAccounts(
          apiKey
        ),

        fetchCampaigns(
          apiKey
        ),
      ]);

    const now =
      new Date().toISOString();

    const accountRows =
      accounts
        .map((account) => {
          const externalId =
            getNumber(
              account.id
            );

          if (
            externalId ===
            null
          ) {
            return null;
          }

          return {
            user_id:
              user.id,

            integration_id:
              integrationId,

            external_id:
              externalId,

            email:
              getString(
                account.from_email
              ) ||
              getString(
                account.username
              ),

            from_name:
              getString(
                account.from_name
              ),

            username:
              getString(
                account.username
              ),

            raw_data:
              account,

            synced_at:
              now,

            updated_at:
              now,
          };
        })
        .filter(
          (
            value
          ): value is NonNullable<
            typeof value
          > =>
            value !==
            null
        );

    if (
      accountRows.length >
      0
    ) {
      const {
        error:
          accountUpsertError,
      } =
        await supabase
          .from(
            "email_accounts"
          )
          .upsert(
            accountRows,
            {
              onConflict:
                "integration_id,external_id",
            }
          );

      if (
        accountUpsertError
      ) {
        throw new Error(
          `Account save failed: ${accountUpsertError.message}`
        );
      }
    }

    const {
      data:
        existingCampaigns,
      error:
        existingError,
    } =
      await supabase
        .from("campaigns")
        .select(`
          id,
          external_id,
          status,
          first_seen_active_at
        `)
        .eq(
          "integration_id",
          integrationId
        );

    if (existingError) {
      throw new Error(
        existingError.message
      );
    }

    const existingMap =
      new Map<
        number,
        {
          id: string;
          status:
            | string
            | null;
          first_seen_active_at:
            | string
            | null;
        }
      >();

    for (
      const campaign of
      existingCampaigns ||
      []
    ) {
      existingMap.set(
        Number(
          campaign.external_id
        ),
        {
          id:
            campaign.id,

          status:
            campaign.status,

          first_seen_active_at:
            campaign.first_seen_active_at,
        }
      );
    }

    const campaignRows =
      campaigns
        .map((campaign) => {
          const externalId =
            getNumber(
              campaign.id
            );

          if (
            externalId ===
            null
          ) {
            return null;
          }

          const status =
            getString(
              campaign.status
            )?.toUpperCase() ||
            null;

          const existing =
            existingMap.get(
              externalId
            );

          let firstSeenActiveAt =
            existing
              ?.first_seen_active_at ||
            null;

          if (
            status ===
              "ACTIVE" &&
            !firstSeenActiveAt
          ) {
            firstSeenActiveAt =
              now;
          }

          return {
            user_id:
              user.id,

            integration_id:
              integrationId,

            external_id:
              externalId,

            name:
              getString(
                campaign.name
              ),

            status,

            first_seen_active_at:
              firstSeenActiveAt,

            raw_data:
              campaign,

            synced_at:
              now,

            updated_at:
              now,
          };
        })
        .filter(
          (
            value
          ): value is NonNullable<
            typeof value
          > =>
            value !==
            null
        );

    if (
      campaignRows.length >
      0
    ) {
      const {
        error:
          campaignUpsertError,
      } =
        await supabase
          .from(
            "campaigns"
          )
          .upsert(
            campaignRows,
            {
              onConflict:
                "integration_id,external_id",
            }
          );

      if (
        campaignUpsertError
      ) {
        throw new Error(
          `Campaign save failed: ${campaignUpsertError.message}`
        );
      }
    }

    const {
      data:
        savedCampaigns,
      error:
        savedCampaignsError,
    } =
      await supabase
        .from("campaigns")
        .select(`
          id,
          external_id,
          status
        `)
        .eq(
          "integration_id",
          integrationId
        );

    if (
      savedCampaignsError
    ) {
      throw new Error(
        savedCampaignsError.message
      );
    }

    const historyRows: {
      user_id: string;
      campaign_id: string;
      old_status:
        | string
        | null;
      new_status: string;
      changed_at: string;
    }[] = [];

    for (
      const campaign of
      savedCampaigns ||
      []
    ) {
      const externalId =
        Number(
          campaign.external_id
        );

      const oldCampaign =
        existingMap.get(
          externalId
        );

      const newStatus =
        campaign.status
          ? String(
              campaign.status
            )
          : null;

      if (
        !newStatus
      ) {
        continue;
      }

      if (
        !oldCampaign
      ) {
        historyRows.push({
          user_id:
            user.id,

          campaign_id:
            campaign.id,

          old_status:
            null,

          new_status:
            newStatus,

          changed_at:
            now,
        });

        continue;
      }

      if (
        oldCampaign.status !==
        newStatus
      ) {
        historyRows.push({
          user_id:
            user.id,

          campaign_id:
            campaign.id,

          old_status:
            oldCampaign.status,

          new_status:
            newStatus,

          changed_at:
            now,
        });
      }
    }

    if (
      historyRows.length >
      0
    ) {
      const {
        error:
          historyError,
      } =
        await supabase
          .from(
            "campaign_status_history"
          )
          .insert(
            historyRows
          );

      if (
        historyError
      ) {
        throw new Error(
          `Campaign history save failed: ${historyError.message}`
        );
      }
    }

    const activeCampaigns =
      campaignRows.filter(
        (campaign) =>
          campaign.status ===
          "ACTIVE"
      ).length;

    const {
      error:
        integrationUpdateError,
    } =
      await supabase
        .from(
          "integrations"
        )
        .update({
          status:
            "connected",

          last_synced_at:
            now,
        })
        .eq(
          "id",
          integrationId
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      integrationUpdateError
    ) {
      throw new Error(
        integrationUpdateError.message
      );
    }

    await supabase
      .from(
        "sync_logs"
      )
      .insert({
        user_id:
          user.id,

        integration_id:
          integrationId,

        provider:
          "smartlead",

        accounts_fetched:
          accountRows.length,

        campaigns_fetched:
          campaignRows.length,

        active_campaigns:
          activeCampaigns,

        status:
          "success",

        message:
          "Smartlead sync completed.",
      });

    return NextResponse.json({
      success: true,

      lastSyncedAt:
        now,

      summary: {
        accountsFetched:
          accountRows.length,

        campaigns:
          campaignRows.length,

        activeCampaigns,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Smartlead sync failed.";

    if (
      userId &&
      integrationId
    ) {
      await supabase
        .from(
          "sync_logs"
        )
        .insert({
          user_id:
            userId,

          integration_id:
            integrationId,

          provider:
            "smartlead",

          accounts_fetched:
            0,

          campaigns_fetched:
            0,

          active_campaigns:
            0,

          status:
            "failed",

          message:
            message.slice(
              0,
              500
            ),
        });

      await supabase
        .from(
          "integrations"
        )
        .update({
          status:
            "error",
        })
        .eq(
          "id",
          integrationId
        )
        .eq(
          "user_id",
          userId
        );
    }

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}