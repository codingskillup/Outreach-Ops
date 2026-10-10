import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { decryptApiKey } from "@/lib/integrationCrypto";

import { scanIssues } from "@/lib/issues/scanIssues";

type RouteContext = {

  params: Promise<{

    id: string;

  }>;

};

type JsonObject = Record<string, unknown>;

type AccountType =

  | "Hypertide Azure/Entra"

  | "Hypertide Google"

  | "Hypertide Google for SendGrid Upload"

  | "Google Workspace"

  | "No Tag";

type SmartleadClient = {

  id: number;

  name: string;

};

function sleep(ms: number) {

  return new Promise((resolve) =>

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

function looksLikeClient(

  value: unknown

) {

  const object =

    asObject(value);

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

    getString(

      object.name

    ) ||

    getString(

      object.client_name

    ) ||

    getString(

      object.clientName

    ) ||

    getString(

      object.company_name

    ) ||

    getString(

      object.companyName

    );

  return (

    id !== null &&

    Boolean(name)

  );

}

function getClientArray(

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

  if (Array.isArray(value)) {

    const directClients =

      value

        .filter(

          (item) =>

            looksLikeClient(

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

        getClientArray(

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

    looksLikeClient(

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

    const key of preferredKeys

  ) {

    if (

      key in object

    ) {

      const nested =

        getClientArray(

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

    Object.values(object)

  ) {

    const nested =

      getClientArray(

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

  if (

    value === null ||

    value === undefined ||

    value === ""

  ) {

    return null;

  }

  const number =

    Number(value);

  if (

    !Number.isFinite(number)

  ) {

    return null;

  }

  return number;

}

function getAccountTagNames(

  account: JsonObject

) {

  const tags =

    getArray(

      account.tags

    );

  return tags

    .map(

      (tag) =>

        getString(

          tag.tag_name

        ) ||

        getString(

          tag.name

        )

    )

    .filter(

      (

        tag

      ): tag is string =>

        Boolean(tag)

    );

}

function classifyAccountType(

  account: JsonObject

): AccountType | null {

  const tags =

    getAccountTagNames(

      account

    ).map(

      (tag) =>

        tag

          .trim()

          .toLowerCase()

    );

  /*

   * Smartlead "No Tag"

   * means the account genuinely

   * has no tags assigned.

   */

  if (

    tags.length === 0

  ) {

    return "No Tag";

  }

  /*

   * IMPORTANT:

   * Check SendGrid Upload BEFORE

   * normal Hypertide Google.

   *

   * Exact matching avoids merging

   * both Smartlead tags together.

   */

  if (

    tags.includes(

      "hypertide google for sendgrid upload"

    )

  ) {

    return "Hypertide Google for SendGrid Upload";

  }

  if (

    tags.includes(

      "hypertide google"

    )

  ) {

    return "Hypertide Google";

  }

  if (

    tags.includes(

      "hypertide azure/entra"

    ) ||

    tags.includes(

      "hypertide p1 only"

    ) ||

    tags.includes(

      "hypertide p2 only"

    )

  ) {

    return "Hypertide Azure/Entra";

  }

  if (

    tags.includes(

      "google workspace"

    )

  ) {

    return "Google Workspace";

  }

  /*

   * Account has some other Smartlead

   * tag that we do not classify.

   *

   * Do NOT call it "No Tag".

   */

  return null;

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

      await fetch(

        url,

        {

          method: "GET",

          cache:

            "no-store",

          signal:

            AbortSignal.timeout(

              25000

            ),

        }

      );

    lastStatus =

      response.status;

    if (response.ok) {

      return response.json();

    }

    if (

      response.status !==

        429 &&

      response.status <

        500

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

      offset >

      50000

    ) {

      throw new Error(

        "Smartlead account pagination safety limit reached."

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

async function fetchClients(

  apiKey: string

) {

  const endpoints = [

    "https://server.smartlead.ai/api/v1/analytics/client/list",

    "https://server.smartlead.ai/api/v1/client/",

  ];

  for (

    const endpoint of endpoints

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

      const json =

        await fetchJsonWithRetry(

          url.toString()

        );

      const clientItems =

        getClientArray(

          json

        );

      const clientMap =

        new Map<

          number,

          SmartleadClient

        >();

      for (

        const client of

        clientItems

      ) {

        const id =

          getNumber(

            client.id

          ) ??

          getNumber(

            client.client_id

          ) ??

          getNumber(

            client.clientId

          );

        const name =

          getString(

            client.name

          ) ||

          getString(

            client.client_name

          ) ||

          getString(

            client.clientName

          ) ||

          getString(

            client.company_name

          ) ||

          getString(

            client.companyName

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

      /*

       * Client enrichment must never

       * break the core Smartlead sync.

       *

       * Try the next read-only GET

       * endpoint if this one is not

       * available for the account.

       */

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

function buildClientMap(

  clients: SmartleadClient[]

) {

  return new Map(

    clients.map(

      (client) => [

        client.id,

        client,

      ]

    )

  );

}

function enrichWithClient(

  raw: JsonObject,

  clientMap: Map<

    number,

    SmartleadClient

  >

) {

  const clientId =

    getNumber(

      raw.client_id

    );

  if (

    clientId ===

    null

  ) {

    return {

      ...raw,

      client_name:

        null,

    };

  }

  const client =

    clientMap.get(

      clientId

    );

  if (!client) {

    return {

      ...raw,

      client_name:

        null,

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

export async function POST(

  _request: Request,

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

      data: {

        user,

      },

    } =

      await supabase

        .auth

        .getUser();

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

      data:

        integration,

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

    /*

     * Smartlead calls in this route are GET only.

     * Nothing is changed inside Smartlead.

     */

    const [

      accounts,

      campaigns,

      clients,

    ] =

      await Promise.all([

        fetchAllEmailAccounts(

          apiKey

        ),

        fetchCampaigns(

          apiKey

        ),

        fetchClients(

          apiKey

        ),

      ]);

    const clientMap =

      buildClientMap(

        clients

      );

    const now =

      new Date()

        .toISOString();

    /*

     * =========================================

     * EMAIL ACCOUNTS

     * =========================================

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

            const accountType =

              classifyAccountType(

                account

              );

            const enrichedRawData =

              enrichWithClient(

                account,

                clientMap

              );

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

                  account.email

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

              account_type:

                accountType,

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

          error:

            accountUpsertError,

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

        if (

          accountUpsertError

        ) {

          throw new Error(

            `Account save failed: ${accountUpsertError.message}`

          );

        }

      }

    }

    /*

     * =========================================

     * CAMPAIGNS

     * =========================================

     */

    const {

      data:

        existingCampaigns,

      error:

        existingError,

    } =

      await supabase

        .from(

          "campaigns"

        )

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

    if (

      existingError

    ) {

      throw new Error(

        existingError

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

          campaign

            .external_id

        ),

        {

          id:

            campaign.id,

          status:

            campaign.status,

          first_seen_active_at:

            campaign

              .first_seen_active_at,

        }

      );

    }

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

              getString(

                campaign.status

              )

                ?.toUpperCase() ||

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

            const enrichedRawData =

              enrichWithClient(

                campaign,

                clientMap

              );

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

          error:

            campaignUpsertError,

        } =

          await supabase

            .from(

              "campaigns"

            )

            .upsert(

              chunk,

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

    }

    /*

     * =========================================

     * CAMPAIGN STATUS HISTORY

     * =========================================

     */

    const {

      data:

        savedCampaigns,

      error:

        savedCampaignsError,

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

    if (

      savedCampaignsError

    ) {

      throw new Error(

        savedCampaignsError

          .message

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

      if (!newStatus) {

        continue;

      }

      if (!oldCampaign) {

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

      const chunkSize =

        500;

      for (

        let index = 0;

        index <

        historyRows.length;

        index +=

          chunkSize

      ) {

        const chunk =

          historyRows.slice(

            index,

            index +

              chunkSize

          );

        const {

          error:

            historyError,

        } =

          await supabase

            .from(

              "campaign_status_history"

            )

            .insert(

              chunk

            );

        if (

          historyError

        ) {

          throw new Error(

            `Campaign history save failed: ${historyError.message}`

          );

        }

      }

    }

    /*

     * =========================================

     * SUMMARY

     * =========================================

     */

    const activeCampaigns =

      campaignRows.filter(

        (campaign) =>

          campaign.status ===

          "ACTIVE"

      ).length;

    const azureEntraAccounts =

      accountRows.filter(

        (account) =>

          account.account_type ===

          "Hypertide Azure/Entra"

      ).length;

    const hypertideGoogleAccounts =

      accountRows.filter(

        (account) =>

          account.account_type ===

          "Hypertide Google"

      ).length;

    const sendGridUploadAccounts =

      accountRows.filter(

        (account) =>

          account.account_type ===

          "Hypertide Google for SendGrid Upload"

      ).length;

    const googleWorkspaceAccounts =

      accountRows.filter(

        (account) =>

          account.account_type ===

          "Google Workspace"

      ).length;

    const noTagAccounts =

      accountRows.filter(

        (account) =>

          account.account_type ===

          "No Tag"

      ).length;

    const unclassifiedAccounts =

      accountRows.filter(

        (account) =>

          !account.account_type

      ).length;

    const clientMappedAccounts =

      accountRows.filter(

        (account) => {

          const raw =

            asObject(

              account.raw_data

            );

          return Boolean(

            getString(

              raw.client_name

            )

          );

        }

      ).length;

    const unmappedClientAccounts =

      accountRows.length -

      clientMappedAccounts;

    /*

     * =========================================

     * CONNECTION STATUS

     * =========================================

     */

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

        integrationUpdateError

          .message

      );

    }

    /*

     * =========================================

     * SYNC LOG

     * =========================================

     */

    const {

      error:

        syncLogError,

    } =

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

          domains_fetched:

            0,

          status:

            "success",

          message:

            `Smartlead sync completed. ${accountRows.length} accounts fetched; ${clients.length} clients fetched; ${clientMappedAccounts} accounts mapped to clients; ${unmappedClientAccounts} accounts without a client mapping; ${unclassifiedAccounts} unclassified account types.`,

        });

    if (

      syncLogError

    ) {

      console.error(

        "Smartlead sync log error:",

        syncLogError.message

      );

    }

    // Automatically trigger issue audit scan so newly detected or resolved issues are immediately updated
    let auditSummary: unknown = null;
    try {
      auditSummary = await scanIssues({
        supabase,
        userId,
        sendAlerts: true,
      });
    } catch (auditErr) {
      console.warn("Auto-audit after Smartlead sync error:", auditErr);
    }

    return NextResponse.json({

      success: true,

      lastSyncedAt:

        now,

      summary: {

  accountsFetched:

    accountRows.length,

  clientsFetched:

    clients.length,

  clientMappedAccounts,

  unmappedClientAccounts,

  azureEntraAccounts,

  hypertideGoogleAccounts,

  sendGridUploadAccounts,

  googleWorkspaceAccounts,

  noTagAccounts,

  unclassifiedAccounts,

  campaigns:

    campaignRows.length,

  activeCampaigns,

},

      clients:

        clients.map(

          (client) => ({

            id:

              client.id,

            name:

              client.name,

          })

        ),

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
