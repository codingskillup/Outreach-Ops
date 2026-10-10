import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  encryptApiKey,
} from "@/lib/integrationCrypto";

type ValidationResult = {
  valid: boolean;
  error?: string;
  campaignCount?: number;
  domainCount?: number;
};

async function validateSmartleadApiKey(
  apiKey: string
): Promise<ValidationResult> {
  try {
    const url =
      new URL(
        "https://server.smartlead.ai/api/v1/campaigns/"
      );

    url.searchParams.set(
      "api_key",
      apiKey
    );

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",
          cache: "no-store",
          signal:
            AbortSignal.timeout(
              15000
            ),
        }
      );

    if (!response.ok) {
      return {
        valid: false,
        error:
          "Invalid Smartlead API key.",
      };
    }

    const json =
      await response.json();

    const data =
      Array.isArray(json)
        ? json
        : Array.isArray(
              json?.data
            )
          ? json.data
          : [];

    return {
      valid: true,
      campaignCount:
        data.length,
    };
  } catch {
    return {
      valid: false,
      error:
        "Could not reach Smartlead.",
    };
  }
}

async function validateEmailGuardApiKey(
  apiKey: string
): Promise<ValidationResult> {
  try {
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
              15000
            ),
        }
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return {
        valid: false,
        error:
          "Invalid EmailGuard API key.",
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error:
          "EmailGuard API could not validate this key.",
      };
    }

    const json =
      await response.json();

    const domains =
      Array.isArray(
        json?.data
      )
        ? json.data
        : [];

    return {
      valid: true,
      domainCount:
        domains.length,
    };
  } catch {
    return {
      valid: false,
      error:
        "Could not reach EmailGuard.",
    };
  }
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

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

    const body =
      await request.json();

    const provider =
      String(
        body.provider || ""
      )
        .trim()
        .toLowerCase();

    const name =
      String(
        body.name || ""
      ).trim();

    const apiKey =
      String(
        body.apiKey || ""
      ).trim();

    if (
      !provider ||
      !name ||
      !apiKey
    ) {
      return NextResponse.json(
        {
          error:
            "Provider, connection name and API key are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      provider !==
        "smartlead" &&
      provider !==
        "emailguard"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid provider.",
        },
        {
          status: 400,
        }
      );
    }

    let validation:
      ValidationResult;

    if (
      provider ===
      "smartlead"
    ) {
      validation =
        await validateSmartleadApiKey(
          apiKey
        );
    } else {
      validation =
        await validateEmailGuardApiKey(
          apiKey
        );
    }

    if (!validation.valid) {
      return NextResponse.json(
        {
          error:
            validation.error ||
            "API key validation failed.",
        },
        {
          status: 400,
        }
      );
    }

    const encryptedApiKey =
      encryptApiKey(apiKey);

    const apiKeyLast4 =
      apiKey.length >= 4
        ? apiKey.slice(-4)
        : apiKey;

    const {
      data,
      error,
    } =
      await supabase
        .from("integrations")
        .insert({
          user_id:
            user.id,

          provider,

          name,

          encrypted_api_key:
            encryptedApiKey,

          api_key_last4:
            apiKeyLast4,

          status:
            "connected",

          last_synced_at:
            null,
        })
        .select(`
          id,
          provider,
          name,
          status,
          api_key_last4,
          last_synced_at,
          created_at
        `)
        .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      integration: data,

      validation: {
        verified: true,

        campaignCount:
          validation.campaignCount ??
          null,

        domainCount:
          validation.domainCount ??
          null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save connection.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Integration ID is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Workspace name cannot be empty." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("integrations")
      .update({ name })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        id,
        provider,
        name,
        status,
        api_key_last4,
        last_synced_at,
        created_at
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      integration: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update workspace name.",
      },
      {
        status: 500,
      }
    );
  }
}