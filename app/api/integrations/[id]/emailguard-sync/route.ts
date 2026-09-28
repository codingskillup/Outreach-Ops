import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  decryptApiKey,
} from "@/lib/integrationCrypto";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type JsonObject =
  Record<string, unknown>;

export async function POST(
  request: Request,
  context: RouteContext
) {
  const supabase =
    await createClient();

  let userId = "";
  let integrationId = "";

  try {
    const { id } =
      await context.params;

    integrationId = id;

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

    userId = user.id;

    const {
      data: integration,
      error:
        integrationError,
    } =
      await supabase
        .from("integrations")
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
      "emailguard"
    ) {
      return NextResponse.json(
        {
          error:
            "This is not an EmailGuard connection.",
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
            "Encrypted EmailGuard API key is missing.",
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

    const response =
      await fetch(
        "https://app.emailguard.io/api/v1/domains",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            Accept:
              "application/json",
          },

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              30000
            ),
        }
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        "EmailGuard API key was rejected."
      );
    }

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `EmailGuard request failed with ${response.status}: ${errorText.slice(
          0,
          200
        )}`
      );
    }

    const json =
      await response.json();

    const domains =
      getDataArray(json);

    const now =
      new Date().toISOString();

    const rows =
      domains
        .map((domain) =>
          createDomainRow(
            domain,
            user.id,
            integrationId,
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
      rows.length > 0
    ) {
      const {
        error: upsertError,
      } =
        await supabase
          .from("domains")
          .upsert(
            rows,
            {
              onConflict:
                "user_id,domain",
            }
          );

      if (upsertError) {
        throw new Error(
          `Domain save failed: ${upsertError.message}`
        );
      }
    }

    const {
      error:
        integrationUpdateError,
    } =
      await supabase
        .from("integrations")
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

    const {
      error: logError,
    } =
      await supabase
        .from("sync_logs")
        .insert({
          user_id:
            user.id,

          integration_id:
            integrationId,

          provider:
            "emailguard",

          accounts_fetched:
            0,

          campaigns_fetched:
            0,

          active_campaigns:
            0,

          domains_fetched:
            rows.length,

          status:
            "success",

          message:
            "EmailGuard domain sync completed.",
        });

    if (logError) {
      console.error(
        "EmailGuard sync log error:",
        logError.message
      );
    }

    return NextResponse.json({
      success: true,

      lastSyncedAt:
        now,

      summary: {
        domainsFetched:
          rows.length,

        healthy:
          rows.filter(
            (row) =>
              row.overall_status ===
              "Healthy"
          ).length,

        attention:
          rows.filter(
            (row) =>
              row.overall_status ===
              "Attention"
          ).length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "EmailGuard sync failed.";

    if (
      userId &&
      integrationId
    ) {
      await supabase
        .from("integrations")
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

      await supabase
        .from("sync_logs")
        .insert({
          user_id:
            userId,

          integration_id:
            integrationId,

          provider:
            "emailguard",

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
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}

function getDataArray(
  value: unknown
): JsonObject[] {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return [];
  }

  const object =
    value as JsonObject;

  if (
    !Array.isArray(
      object.data
    )
  ) {
    return [];
  }

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

function createDomainRow(
  domain: JsonObject,
  userId: string,
  integrationId: string,
  now: string
) {
  const domainName =
    getText(
      domain.name
    ) ||
    getText(
      domain.domain
    );

  if (!domainName) {
    return null;
  }

  const externalId =
    getText(
      domain.uuid
    ) ||
    getText(
      domain.id
    ) ||
    domainName;

  const spfStatus =
    getAuthenticationStatus(
      domain,
      [
        "spf_status",
        "spfStatus",
        "spf_valid",
        "spfValid",
      ]
    );

  const dkimStatus =
    getAuthenticationStatus(
      domain,
      [
        "dkim_status",
        "dkimStatus",
        "dkim_valid",
        "dkimValid",
      ]
    );

  const dmarcStatus =
    getAuthenticationStatus(
      domain,
      [
        "dmarc_status",
        "dmarcStatus",
        "dmarc_valid",
        "dmarcValid",
      ]
    );

  const dmarcPolicy =
    getText(
      domain.dmarc_policy
    ) ||
    getText(
      domain.dmarcPolicy
    ) ||
    "Unknown";

  const reportingStatus =
    getReportingStatus(
      domain
    );

  const overallStatus =
    getOverallStatus({
      spfStatus,
      dkimStatus,
      dmarcStatus,
      reportingStatus,
    });

  return {
    user_id:
      userId,

    integration_id:
      integrationId,

    external_id:
      externalId,

    domain:
      domainName,

    client:
      getText(
        domain.client_name
      ) ||
      getText(
        domain.client
      ) ||
      null,

    spf_status:
      spfStatus,

    dkim_status:
      dkimStatus,

    dmarc_status:
      dmarcStatus,

    dmarc_policy:
      dmarcPolicy,

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

function getAuthenticationStatus(
  object: JsonObject,
  keys: string[]
) {
  for (
    const key of keys
  ) {
    const value =
      object[key];

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
      if (value === 1) {
        return "Valid";
      }

      if (value === 0) {
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
          "active",
          "healthy",
        ].includes(text)
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
        ].includes(text)
      ) {
        return "Invalid";
      }
    }
  }

  return "Unknown";
}

function getReportingStatus(
  domain: JsonObject
) {
  const possible =
    [
      domain.reporting_status,
      domain.reportingStatus,
      domain.dmarc_reporting_status,
      domain.dmarcReportingStatus,
    ];

  for (
    const value of
    possible
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
          "active",
          "enabled",
          "valid",
        ].includes(text)
      ) {
        return "Monitored";
      }

      if (
        [
          "not monitored",
          "disabled",
          "inactive",
          "missing",
        ].includes(text)
      ) {
        return "Not Monitored";
      }
    }
  }

  return "Unknown";
}

function getOverallStatus({
  spfStatus,
  dkimStatus,
  dmarcStatus,
  reportingStatus,
}: {
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  reportingStatus: string;
}) {
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
    return "Attention";
  }

  if (
    spfStatus ===
      "Valid" &&
    dkimStatus ===
      "Valid" &&
    dmarcStatus ===
      "Valid" &&
    reportingStatus !==
      "Not Monitored"
  ) {
    return "Healthy";
  }

  return "Unknown";
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

    return result ||
      null;
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