import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/integrationCrypto";

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
      ).trim();

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
            "Provider, name and API key are required.",
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

          api_key: null,
        })
        .select(
          `
          id,
          provider,
          name,
          status,
          api_key_last4,
          last_synced_at,
          created_at
          `
        )
        .single();

    if (error) {
      console.error(
        "Integration insert error:",
        error
      );

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
    });
  } catch (error) {
    console.error(
      "Integration API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save integration.",
      },
      {
        status: 500,
      }
    );
  }
}