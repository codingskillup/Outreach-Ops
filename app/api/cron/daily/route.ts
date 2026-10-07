import {

  NextResponse,

  type NextRequest,

} from "next/server";



import {

  createAdminClient,

} from "@/lib/supabase/admin";



import {

  decryptApiKey,

} from "@/lib/integrationCrypto";



import {

  scanIssues,

} from "@/lib/issues/scanIssues";



import {

  sendDailyReport,

} from "@/lib/email/dailyReport";







export const runtime = "nodejs";

export const maxDuration = 300;



type JsonObject =

  Record<string, unknown>;



type SmartleadClient = {
  id: number;
  name: string;
};


type Integration = {

  id: string;

  user_id: string;

  provider: string;

  name: string;

  encrypted_api_key:

    | string

    | null;

};



type SyncResult = {

  integrationId: string;

  provider: string;

  name: string;

  success: boolean;

  accounts?: number;

  campaigns?: number;

  activeCampaigns?: number;

  domains?: number;

  error?: string;

};





export async function GET(

  request: NextRequest

) {

  const cronSecret =

    process.env.CRON_SECRET;



  const authorization =

    request.headers.get(

      "authorization"

    );



  if (

    !cronSecret ||

    authorization !==

      `Bearer ${cronSecret}`

  ) {

    return NextResponse.json(

      {

        error: "Unauthorized",

      },

      {

        status: 401,

      }

    );

  }



  const mode =

    request.nextUrl.searchParams.get(

      "mode"

    ) === "monitor"

      ? "monitor"

      : "daily";



  const supabase =

    createAdminClient();



  try {

    const {

      data: integrations,

      error,

    } = await supabase

      .from("integrations")

      .select(`

        id,

        user_id,

        provider,

        name,

        encrypted_api_key

      `)

      .not(

        "encrypted_api_key",

        "is",

        null

      );



    if (error) {

      throw new Error(

        error.message

      );

    }



    const typedIntegrations =

      (integrations ||

        []) as Integration[];



    const results:

      SyncResult[] = [];



    for (

      const integration of

      typedIntegrations

    ) {

      try {

        if (

          integration.provider ===

          "smartlead"

        ) {

          const result =

            await syncSmartlead(

              integration

            );



          results.push(result);



          continue;

        }



        if (

          integration.provider ===

          "emailguard"

        ) {

          const result =

            await syncEmailGuard(

              integration

            );



          results.push(result);



          continue;

        }



        results.push({

          integrationId:

            integration.id,



          provider:

            integration.provider,



          name:

            integration.name,



          success: false,



          error:

            "Unsupported provider.",

        });

      } catch (error) {

        const message =

          error instanceof Error

            ? error.message

            : "Sync failed.";



        await markIntegrationFailed(

          integration,

          message

        );



        results.push({

          integrationId:

            integration.id,



          provider:

            integration.provider,



          name:

            integration.name,



          success: false,



          error: message,

        });

      }

    }



    /*

      Run issue scanning once

      per portal user.

    */



    const userIds = [

      ...new Set(

        typedIntegrations.map(

          (integration) =>

            integration.user_id

        )

      ),

    ];



    const notificationResults: {

      userId: string;

      success: boolean;

      dailyReportSent: boolean;

      scanSummary?: unknown;

      error?: string;

    }[] = [];



    for (

      const userId of

      userIds

    ) {

      try {

        /*

          sendAlerts = true



          scanIssues itself decides

          whether an issue is NEW

          before sending an alert.

        */



        const scanSummary =

          await scanIssues({

            supabase,

            userId,

            sendAlerts: true,

          });



        /*

          Only the daily mode

          sends the 8 AM report.



          monitor mode only scans

          and sends NEW issue alerts.

        */



        if (

          mode === "daily"

        ) {

          await sendDailyReport({

            supabase,

            userId,

            scanSummary,

          });

        }



        notificationResults.push({

          userId,



          success: true,



          dailyReportSent:

            mode === "daily",



          scanSummary,

        });

      } catch (error) {

        const message =

          error instanceof Error

            ? error.message

            : "Issue scan failed.";



        console.error(

          `Cron notification error for ${userId}:`,

          message

        );



        notificationResults.push({

          userId,



          success: false,



          dailyReportSent:

            false,



          error: message,

        });

      }

    }



    const successful =

      results.filter(

        (result) =>

          result.success

      ).length;



    const failed =

      results.filter(

        (result) =>

          !result.success

      ).length;



    const notificationFailures =

      notificationResults.filter(

        (result) =>

          !result.success

      ).length;



    return NextResponse.json({

      success:

        failed === 0 &&

        notificationFailures ===

          0,



      mode,



      executedAt:

        new Date().toISOString(),



      integrations:

        results.length,



      successful,



      failed,



      results,



      usersProcessed:

        userIds.length,



      notificationFailures,



      notifications:

        notificationResults,

    });

  } catch (error) {

    return NextResponse.json(

      {

        success: false,



        mode,



        error:

          error instanceof Error

            ? error.message

            : "Automatic monitoring failed.",

      },

      {

        status: 500,

      }

    );

  }

}



/*

 * =========================================

 * SMARTLEAD SYNC

 * =========================================

 */



async function syncSmartlead(
  integration: Integration
): Promise<SyncResult> {
  const supabase =
    createAdminClient();

  if (
    !integration
      .encrypted_api_key
  ) {
    throw new Error(
      "Smartlead encrypted API key is missing."
    );
  }

  const apiKey =
    decryptApiKey(
      integration
        .encrypted_api_key
    );

  /*
   * All Smartlead requests in this
   * automatic sync are GET requests.
   *
   * Nothing is created, edited or
   * deleted inside Smartlead.
   */
  const [
    accounts,
    campaigns,
    clients,
  ] =
    await Promise.all([
      fetchAllSmartleadAccounts(
        apiKey
      ),

      fetchSmartleadCampaigns(
        apiKey
      ),

      fetchSmartleadClients(
        apiKey
      ),
    ]);

  if (
    clients.length ===
    0
  ) {
    throw new Error(
      "Smartlead client list returned no usable clients. Sync stopped to preserve existing client mappings."
    );
  }

  const clientMap =
    buildSmartleadClientMap(
      clients
    );

  const now =
    new Date()
      .toISOString();

  /*
   * Save email accounts.
   *
   * client_id comes from Smartlead.
   * client_name is added locally to
   * raw_data for portal reporting.
   */
  const accountRows =
    accounts
      .map(
        (account) => {
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

          const enrichedRawData =
            enrichSmartleadClient(
              account,
              clientMap
            );

          return {
            user_id:
              integration.user_id,

            integration_id:
              integration.id,

            external_id:
              externalId,

            email:
              getText(
                account.from_email
              ) ||
              getText(
                account.email
              ) ||
              getText(
                account.username
              ),

            from_name:
              getText(
                account.from_name
              ),

            username:
              getText(
                account.username
              ),

            raw_data:
              enrichedRawData,

            synced_at:
              now,

            updated_at:
              now,
          };
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > =>
          row !== null
      );

  if (
    accountRows.length >
    0
  ) {
    const chunkSize =
      500;

    for (
      let index = 0;
      index <
      accountRows.length;
      index +=
        chunkSize
    ) {
      const chunk =
        accountRows.slice(
          index,
          index +
            chunkSize
        );

      const {
        error,
      } =
        await supabase
          .from(
            "email_accounts"
          )
          .upsert(
            chunk,
            {
              onConflict:
                "integration_id,external_id",
            }
          );

      if (error) {
        throw new Error(
          `Email account save failed: ${error.message}`
        );
      }
    }
  }

  /*
   * Load existing campaigns so
   * campaign status changes can
   * still be recorded.
   */
  const {
    data:
      existingCampaigns,
    error:
      existingCampaignError,
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
        integration.id
      );

  if (
    existingCampaignError
  ) {
    throw new Error(
      existingCampaignError
        .message
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

        firstSeenActiveAt:
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

        firstSeenActiveAt:
          campaign
            .first_seen_active_at,
      }
    );
  }

  /*
   * Save every campaign returned by
   * the API, including subsequences.
   *
   * Child/subsequence campaigns are
   * retained in Supabase for history,
   * but excluded from user-facing
   * Smartlead campaign counts below.
   */
  const campaignRows =
    campaigns
      .map(
        (campaign) => {
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
            normalizeStatus(
              getText(
                campaign.status
              )
            );

          const existing =
            existingMap.get(
              externalId
            );

          let firstSeenActiveAt =
            existing
              ?.firstSeenActiveAt ||
            null;

          if (
            status ===
              "ACTIVE" &&
            !firstSeenActiveAt
          ) {
            firstSeenActiveAt =
              now;
          }

          const enrichedRawData =
            enrichSmartleadClient(
              campaign,
              clientMap
            );

          return {
            user_id:
              integration.user_id,

            integration_id:
              integration.id,

            external_id:
              externalId,

            name:
              getText(
                campaign.name
              ) ||
              `Campaign ${externalId}`,

            status,

            first_seen_active_at:
              firstSeenActiveAt,

            raw_data:
              enrichedRawData,

            synced_at:
              now,

            updated_at:
              now,
          };
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > =>
          row !== null
      );

  if (
    campaignRows.length >
    0
  ) {
    const chunkSize =
      500;

    for (
      let index = 0;
      index <
      campaignRows.length;
      index +=
        chunkSize
    ) {
      const chunk =
        campaignRows.slice(
          index,
          index +
            chunkSize
        );

      const {
        error,
      } =
        await supabase
          .from("campaigns")
          .upsert(
            chunk,
            {
              onConflict:
                "integration_id,external_id",
            }
          );

      if (error) {
        throw new Error(
          `Campaign save failed: ${error.message}`
        );
      }
    }
  }

  /*
   * Record campaign status changes.
   */
  await saveCampaignHistory(
    integration.user_id,
    integration.id,
    existingMap,
    now
  );

  /*
   * Smartlead's main Campaign UI does
   * not count child/subsequence rows.
   *
   * In the current workspace:
   * API rows = 225
   * main campaigns = 222
   *
   * We calculate the automatic metrics
   * using main campaigns only.
   */
  const mainCampaignRows =
    campaignRows.filter(
      (campaign) =>
        isMainSmartleadCampaign(
          campaign.raw_data
        )
    );

  const activeCampaigns =
    mainCampaignRows.filter(
      (campaign) =>
        campaign.status ===
        "ACTIVE"
    ).length;

  const mappedAccounts =
    accountRows.filter(
      (account) =>
        hasClientName(
          account.raw_data
        )
    ).length;

  const mappedCampaigns =
    mainCampaignRows.filter(
      (campaign) =>
        hasClientName(
          campaign.raw_data
        )
    ).length;

  /*
   * Mark connection as successfully
   * synced.
   */
  const {
    error:
      updateError,
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
        integration.id
      );

  if (
    updateError
  ) {
    throw new Error(
      updateError.message
    );
  }

  /*
   * Activity / sync log.
   *
   * campaigns_fetched uses the
   * main-campaign count so reports
   * match the Smartlead UI.
   */
  const {
    error:
      logError,
  } =
    await supabase
      .from(
        "sync_logs"
      )
      .insert({
        user_id:
          integration.user_id,

        integration_id:
          integration.id,

        provider:
          "smartlead",

        accounts_fetched:
          accountRows.length,

        campaigns_fetched:
          mainCampaignRows.length,

        active_campaigns:
          activeCampaigns,

        domains_fetched:
          0,

        status:
          "success",

        message:
          `Automatic Smartlead sync completed. ${accountRows.length} accounts; ${clients.length} clients; ${mappedAccounts} accounts mapped; ${mainCampaignRows.length} main campaigns; ${mappedCampaigns} main campaigns mapped; ${campaignRows.length - mainCampaignRows.length} child campaigns excluded from UI counts.`,
      });

  if (
    logError
  ) {
    console.error(
      "Smartlead sync log error:",
      logError.message
    );
  }

  return {
    integrationId:
      integration.id,

    provider:
      "smartlead",

    name:
      integration.name,

    success:
      true,

    accounts:
      accountRows.length,

    campaigns:
      mainCampaignRows.length,

    activeCampaigns,
  };
}



/*
 * =========================================
 * EMAILGUARD SYNC
 * =========================================
 */

async function syncEmailGuard(

  integration: Integration

): Promise<SyncResult> {

  const supabase =

    createAdminClient();



  if (

    !integration

      .encrypted_api_key

  ) {

    throw new Error(

      "EmailGuard encrypted API key is missing."

    );

  }



  const apiKey =

    decryptApiKey(

      integration

        .encrypted_api_key

    );



  const response =

    await fetch(

      "https://app.emailguard.io/api/v1/domains",

      {

        method:

          "GET",



        headers: {

          Authorization:

            `Bearer ${apiKey}`,



          Accept:

            "application/json",

        },



        cache:

          "no-store",



        signal:

          AbortSignal.timeout(

            30000

          ),

      }

    );



  if (

    !response.ok

  ) {

    throw new Error(

      `EmailGuard request failed with status ${response.status}.`

    );

  }



  const json =

    await response.json();



  const domains =

    getArray(

      json

    );



  const now =

    new Date()

      .toISOString();



  const domainRows =

    domains

      .map(

        (domain) =>

          createDomainRow(

            domain,

            integration,

            now

          )

      )

      .filter(

        (

          row

        ): row is NonNullable<

          typeof row

        > =>

          row !== null

      );



  if (

    domainRows.length >

    0

  ) {

    const {

      error,

    } =

      await supabase

        .from(

          "domains"

        )

        .upsert(

          domainRows,

          {

            onConflict:

  "integration_id,domain",

          }

        );



    if (error) {

      throw new Error(

        `Domain save failed: ${error.message}`

      );

    }

  }



  /*

   * Update connection

   */

  const {

    error:

      updateError,

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

        integration.id

      );



  if (

    updateError

  ) {

    throw new Error(

      updateError.message

    );

  }



  /*

   * Sync activity

   */

  const {

    error:

      logError,

  } =

    await supabase

      .from(

        "sync_logs"

      )

      .insert({

        user_id:

          integration.user_id,



        integration_id:

          integration.id,



        provider:

          "emailguard",



        accounts_fetched:

          0,



        campaigns_fetched:

          0,



        active_campaigns:

          0,



        domains_fetched:

          domainRows.length,



        status:

          "success",



        message:

          "Automatic EmailGuard sync completed.",

      });



  if (

    logError

  ) {

    console.error(

      "EmailGuard sync log error:",

      logError.message

    );

  }



  return {

    integrationId:

      integration.id,



    provider:

      "emailguard",



    name:

      integration.name,



    success:

      true,



    domains:

      domainRows.length,

  };

}



/*

 * =========================================

 * FAILED SYNC

 * =========================================

 */



async function markIntegrationFailed(

  integration:

    Integration,

  message: string

) {

  const supabase =

    createAdminClient();



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

      integration.id

    );



  const {

    error,

  } =

    await supabase

      .from(

        "sync_logs"

      )

      .insert({

        user_id:

          integration.user_id,



        integration_id:

          integration.id,



        provider:

          integration.provider,



        accounts_fetched:

          0,



        campaigns_fetched:

          0,



        active_campaigns:

          0,



        domains_fetched:

          0,



        status:

          "failed",



        message:

          message.slice(

            0,

            500

          ),

      });



  if (error) {

    console.error(

      "Failed sync log error:",

      error.message

    );

  }

}



/*

 * =========================================

 * SMARTLEAD API HELPERS

 * =========================================

 */



async function fetchAllSmartleadAccounts(

  apiKey: string

) {

  const accounts:

    JsonObject[] = [];



  const limit =

    100;



  let offset =

    0;



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

      String(

        offset

      )

    );



    url.searchParams.set(

      "limit",

      String(

        limit

      )

    );



    const response =

      await fetchWithRetry(

        url.toString(),

        {

          method:

            "GET",

        }

      );



    const json =

      await response.json();



    const page =

      getArray(

        json

      );



    accounts.push(

      ...page

    );



    if (

      page.length <

      limit

    ) {

      break;

    }



    offset +=

      limit;



    if (

      offset >

      50000

    ) {

      throw new Error(

        "Smartlead pagination safety limit reached."

      );

    }

  }



  return accounts;

}



async function fetchSmartleadCampaigns(

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



  const response =

    await fetchWithRetry(

      url.toString(),

      {

        method:

          "GET",

      }

    );



  const json =

    await response.json();



  return getArray(

    json

  );

}



type SmartleadClientMap =
  Map<number, SmartleadClient>;

function asJsonObject(
  value: unknown
): JsonObject {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

function looksLikeSmartleadClient(
  value: unknown
) {
  const object =
    asJsonObject(
      value
    );

  const id =
    getNumber(
      object.id
    ) ??
    getNumber(
      object.client_id
    ) ??
    getNumber(
      object.clientId
    );

  const name =
    getText(
      object.name
    ) ||
    getText(
      object.client_name
    ) ||
    getText(
      object.clientName
    ) ||
    getText(
      object.company_name
    ) ||
    getText(
      object.companyName
    );

  return (
    id !== null &&
    Boolean(name)
  );
}

function getSmartleadClientArray(
  value: unknown,
  depth = 0
): JsonObject[] {
  if (
    depth > 5 ||
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    const directClients =
      value
        .filter(
          (item) =>
            looksLikeSmartleadClient(
              item
            )
        )
        .map(
          (item) =>
            item as JsonObject
        );

    if (
      directClients.length >
      0
    ) {
      return directClients;
    }

    for (
      const item of value
    ) {
      const nested =
        getSmartleadClientArray(
          item,
          depth + 1
        );

      if (
        nested.length >
        0
      ) {
        return nested;
      }
    }

    return [];
  }

  if (
    typeof value !==
      "object"
  ) {
    return [];
  }

  if (
    looksLikeSmartleadClient(
      value
    )
  ) {
    return [
      value as JsonObject,
    ];
  }

  const object =
    value as JsonObject;

  const preferredKeys = [
    "clients",
    "client_list",
    "clientList",
    "data",
    "result",
    "results",
    "items",
  ];

  for (
    const key of
    preferredKeys
  ) {
    if (
      key in object
    ) {
      const nested =
        getSmartleadClientArray(
          object[key],
          depth + 1
        );

      if (
        nested.length >
        0
      ) {
        return nested;
      }
    }
  }

  for (
    const nestedValue of
    Object.values(
      object
    )
  ) {
    const nested =
      getSmartleadClientArray(
        nestedValue,
        depth + 1
      );

    if (
      nested.length >
      0
    ) {
      return nested;
    }
  }

  return [];
}

async function fetchSmartleadClients(
  apiKey: string
) {
  /*
   * Read-only GET endpoints.
   *
   * The first endpoint is the client
   * analytics list used by the manual
   * Smartlead sync. The second is a
   * fallback for accounts where the
   * response is exposed there instead.
   */
  const endpoints = [
    "https://server.smartlead.ai/api/v1/analytics/client/list",
    "https://server.smartlead.ai/api/v1/client/",
  ];

  for (
    const endpoint of
    endpoints
  ) {
    try {
      const url =
        new URL(
          endpoint
        );

      url.searchParams.set(
        "api_key",
        apiKey
      );

      const response =
        await fetchWithRetry(
          url.toString(),
          {
            method:
              "GET",
          }
        );

      const json =
        await response.json();

      const items =
        getSmartleadClientArray(
          json
        );

      const clientMap =
        new Map<
          number,
          SmartleadClient
        >();

      for (
        const item of
        items
      ) {
        const id =
          getNumber(
            item.id
          ) ??
          getNumber(
            item.client_id
          ) ??
          getNumber(
            item.clientId
          );

        const name =
          getText(
            item.name
          ) ||
          getText(
            item.client_name
          ) ||
          getText(
            item.clientName
          ) ||
          getText(
            item.company_name
          ) ||
          getText(
            item.companyName
          );

        if (
          id === null ||
          !name
        ) {
          continue;
        }

        clientMap.set(
          id,
          {
            id,
            name,
          }
        );
      }

      const clients =
        Array.from(
          clientMap.values()
        );

      if (
        clients.length >
        0
      ) {
        return clients;
      }
    } catch (error) {
      console.warn(
        `Smartlead client endpoint failed: ${endpoint}`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  return [];
}

function buildSmartleadClientMap(
  clients:
    SmartleadClient[]
): SmartleadClientMap {
  return new Map(
    clients.map(
      (client) => [
        client.id,
        client,
      ]
    )
  );
}

function enrichSmartleadClient(
  raw: JsonObject,
  clientMap:
    SmartleadClientMap
) {
  const clientId =
    getNumber(
      raw.client_id
    ) ??
    getNumber(
      raw.clientId
    );

  if (
    clientId ===
    null
  ) {
    return {
      ...raw,
    };
  }

  const client =
    clientMap.get(
      clientId
    );

  if (!client) {
    return {
      ...raw,
      client_id:
        clientId,
    };
  }

  return {
    ...raw,

    client_id:
      clientId,

    client_name:
      client.name,
  };
}

function isMainSmartleadCampaign(
  rawData: unknown
) {
  const raw =
    asJsonObject(
      rawData
    );

  const parentId =
    raw.parent_campaign_id ??
    raw.parentCampaignId;

  return (
    parentId ===
      null ||
    parentId ===
      undefined ||
    parentId ===
      ""
  );
}

function hasClientName(
  rawData: unknown
) {
  const raw =
    asJsonObject(
      rawData
    );

  return Boolean(
    getText(
      raw.client_name
    ) ||
    getText(
      raw.clientName
    )
  );
}



async function fetchWithRetry(

  url: string,

  options: RequestInit

) {

  let lastError =

    "Request failed.";



  for (

    let attempt =

      0;

    attempt <

    4;

    attempt++

  ) {

    try {

      const response =

        await fetch(

          url,

          {

            ...options,



            cache:

              "no-store",



            signal:

              AbortSignal.timeout(

                30000

              ),

          }

        );



      if (

        response.ok

      ) {

        return response;

      }



      lastError =

        `Request failed with status ${response.status}.`;



      if (

        response.status !==

          429 &&

        response.status <

          500

      ) {

        throw new Error(

          lastError

        );

      }

    } catch (error) {

      lastError =

        error instanceof Error

          ? error.message

          : "Request failed.";

    }



    if (

      attempt <

      3

    ) {

      await sleep(

        1000 *

          Math.pow(

            2,

            attempt

          )

      );

    }

  }



  throw new Error(

    lastError

  );

}



/*

 * =========================================

 * CAMPAIGN HISTORY

 * =========================================

 */



async function saveCampaignHistory(

  userId: string,



  integrationId:

    string,



  previousCampaigns:

    Map<

      number,

      {

        id: string;



        status:

          | string

          | null;



        firstSeenActiveAt:

          | string

          | null;

      }

    >,



  now: string

) {

  const supabase =

    createAdminClient();



  const {

    data:

      campaigns,

    error,

  } =

    await supabase

      .from(

        "campaigns"

      )

      .select(`

        id,

        external_id,

        status

      `)

      .eq(

        "integration_id",

        integrationId

      );



  if (error) {

    throw new Error(

      error.message

    );

  }



  const historyRows: {

    user_id: string;



    campaign_id:

      string;



    old_status:

      | string

      | null;



    new_status:

      string;



    changed_at:

      string;

  }[] = [];



  for (

    const campaign of

    campaigns ||

    []

  ) {

    const externalId =

      Number(

        campaign.external_id

      );



    const previous =

      previousCampaigns.get(

        externalId

      );



    const currentStatus =

      campaign.status

        ? String(

            campaign.status

          )

        : null;



    if (

      !currentStatus

    ) {

      continue;

    }



    if (

      !previous

    ) {

      historyRows.push({

        user_id:

          userId,



        campaign_id:

          campaign.id,



        old_status:

          null,



        new_status:

          currentStatus,



        changed_at:

          now,

      });



      continue;

    }



    if (

      previous.status !==

      currentStatus

    ) {

      historyRows.push({

        user_id:

          userId,



        campaign_id:

          campaign.id,



        old_status:

          previous.status,



        new_status:

          currentStatus,



        changed_at:

          now,

      });

    }

  }



  if (

    historyRows.length ===

    0

  ) {

    return;

  }



  const {

    error:

      insertError,

  } =

    await supabase

      .from(

        "campaign_status_history"

      )

      .insert(

        historyRows

      );



  if (

    insertError

  ) {

    throw new Error(

      insertError.message

    );

  }

}



/*

 * =========================================

 * EMAILGUARD DOMAIN MAPPING

 * =========================================

 */



function createDomainRow(

  domain:

    JsonObject,



  integration:

    Integration,



  now: string

) {

  const domainName =

    getText(

      domain.name

    ) ||

    getText(

      domain.domain

    );



  if (

    !domainName

  ) {

    return null;

  }



  const spfStatus =

    getAuthStatus(

      domain.spf_status ??

        domain.spfStatus ??

        domain.spf_valid ??

        domain.spfValid

    );



  const dkimStatus =

    getAuthStatus(

      domain.dkim_status ??

        domain.dkimStatus ??

        domain.dkim_valid ??

        domain.dkimValid

    );



  const dmarcStatus =

    getAuthStatus(

      domain.dmarc_status ??

        domain.dmarcStatus ??

        domain.dmarc_valid ??

        domain.dmarcValid

    );



  const reportingStatus =

    getReportingStatus(

      domain.reporting_status ??

        domain.reportingStatus ??

        domain.dmarc_reporting_status ??

        domain.dmarcReportingStatus

    );



  let overallStatus =

    "Unknown";



  if (

    spfStatus ===

      "Invalid" ||

    dkimStatus ===

      "Invalid" ||

    dmarcStatus ===

      "Invalid" ||

    reportingStatus ===

      "Not Monitored"

  ) {

    overallStatus =

      "Attention";

  } else if (

    spfStatus ===

      "Valid" &&

    dkimStatus ===

      "Valid" &&

    dmarcStatus ===

      "Valid"

  ) {

    overallStatus =

      "Healthy";

  }



  return {

    user_id:

      integration.user_id,



    integration_id:

      integration.id,



    external_id:

      getText(

        domain.uuid

      ) ||

      getText(

        domain.id

      ) ||

      domainName,



    domain:

      domainName,



    client:

      getText(

        domain.client_name

      ) ||

      getText(

        domain.client

      ),



    spf_status:

      spfStatus,



    dkim_status:

      dkimStatus,



    dmarc_status:

      dmarcStatus,



    dmarc_policy:

      getText(

        domain.dmarc_policy

      ) ||

      getText(

        domain.dmarcPolicy

      ) ||

      "Unknown",



    reporting_status:

      reportingStatus,



    overall_status:

      overallStatus,



    raw_data:

      domain,



    synced_at:

      now,



    updated_at:

      now,

  };

}



/*

 * =========================================

 * GENERIC HELPERS

 * =========================================

 */



function getArray(

  value: unknown

): JsonObject[] {

  if (

    Array.isArray(

      value

    )

  ) {

    return value.filter(

      (

        item

      ): item is JsonObject =>

        Boolean(

          item &&

            typeof item ===

              "object" &&

            !Array.isArray(

              item

            )

        )

    );

  }



  if (

    value &&

    typeof value ===

      "object"

  ) {

    const object =

      value as JsonObject;



    if (

      Array.isArray(

        object.data

      )

    ) {

      return object.data.filter(

        (

          item

        ): item is JsonObject =>

          Boolean(

            item &&

              typeof item ===

                "object" &&

              !Array.isArray(

                item

              )

          )

      );

    }



    if (

      Array.isArray(

        object.results

      )

    ) {

      return object.results.filter(

        (

          item

        ): item is JsonObject =>

          Boolean(

            item &&

              typeof item ===

                "object" &&

              !Array.isArray(

                item

              )

          )

      );

    }



    if (

      Array.isArray(

        object.domains

      )

    ) {

      return object.domains.filter(

        (

          item

        ): item is JsonObject =>

          Boolean(

            item &&

              typeof item ===

                "object" &&

              !Array.isArray(

                item

              )

          )

      );

    }

  }



  return [];

}



function getText(

  value: unknown

) {

  if (

    typeof value ===

    "string"

  ) {

    const result =

      value.trim();



    return (

      result ||

      null

    );

  }



  if (

    typeof value ===

    "number"

  ) {

    return String(

      value

    );

  }



  return null;

}



function getNumber(

  value: unknown

) {

  if (

    value === null ||

    value === undefined ||

    value === ""

  ) {

    return null;

  }



  const number =

    Number(

      value

    );



  return Number.isFinite(

    number

  )

    ? number

    : null;

}



function normalizeStatus(

  value:

    | string

    | null

) {

  return (

    value

      ?.trim()

      .toUpperCase() ||

    "UNKNOWN"

  );

}



function getAuthStatus(

  value: unknown

) {

  if (

    typeof value ===

    "boolean"

  ) {

    return value

      ? "Valid"

      : "Invalid";

  }



  if (

    typeof value ===

    "number"

  ) {

    if (

      value ===

      1

    ) {

      return "Valid";

    }



    if (

      value ===

      0

    ) {

      return "Invalid";

    }

  }



  if (

    typeof value ===

    "string"

  ) {

    const text =

      value

        .trim()

        .toLowerCase();



    if (

      [

        "valid",

        "verified",

        "pass",

        "passed",

        "healthy",

        "active",

      ].includes(

        text

      )

    ) {

      return "Valid";

    }



    if (

      [

        "invalid",

        "fail",

        "failed",

        "missing",

        "error",

      ].includes(

        text

      )

    ) {

      return "Invalid";

    }

  }



  return "Unknown";

}



function getReportingStatus(

  value: unknown

) {

  if (

    typeof value ===

    "boolean"

  ) {

    return value

      ? "Monitored"

      : "Not Monitored";

  }



  if (

    typeof value ===

    "string"

  ) {

    const text =

      value

        .trim()

        .toLowerCase();



    if (

      [

        "monitored",

        "enabled",

        "active",

        "valid",

      ].includes(

        text

      )

    ) {

      return "Monitored";

    }



    if (

      [

        "not monitored",

        "disabled",

        "inactive",

        "missing",

      ].includes(

        text

      )

    ) {

      return "Not Monitored";

    }

  }



  return "Unknown";

}



function sleep(

  milliseconds: number

) {

  return new Promise(

    (resolve) =>

      setTimeout(

        resolve,

        milliseconds

      )

  );

}