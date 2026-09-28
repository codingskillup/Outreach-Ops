import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/integrationCrypto";

async function validateSmartleadApiKey(
  apiKey: string
) {
  const url = new URL(
    "https://server.smartlead.ai/api/v1/campaigns/"
  );

  url.searchParams.set(
    "api_key",
    apiKey
  );

  try {
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
          "Invalid Smartlead API key or Smartlead rejected the request.",
      };
    }

    const data =
      await response.json();

    const campaignCount =
      Array.isArray(data)
        ? data.length
        : Array.isArray(
              data?.data
            )
          ? data.data.length
          : 0;

    return {
      valid: true,
      campaignCount,
    };
  } catch {
    return {
      valid: false,
      error:
        "Could not reach Smartlead. Please try again.",
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

    let status =
      "connected";

    let campaignCount:
      | number
      | null = null;

    if (
      provider ===
      "smartlead"
    ) {
      const validation =
        await validateSmartleadApiKey(
          apiKey
        );

      if (!validation.valid) {
        return NextResponse.json(
          {
            error:
              validation.error,
          },
          {
            status: 400,
          }
        );
      }

      campaignCount =
        validation.campaignCount ??
        0;
    }

    if (
      provider ===
      "emailguard"
    ) {
      status = "pending";
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
          user_id: user.id,
          provider,
          name,
          encrypted_api_key:
            encryptedApiKey,
          api_key_last4:
            apiKeyLast4,
          status,
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
        verified:
          provider ===
          "smartlead",
        campaignCount,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to save connection.",
      },
      {
        status: 500,
      }
    );
  }
}