import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type JsonBody =
  Record<string, unknown>;

function getText(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const text =
    value.trim();

  return text || null;
}

function normalizeTagKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function nullableInteger(
  value: unknown,
  label: string,
  max?: number
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
    !Number.isInteger(
      number
    ) ||
    number < 0
  ) {
    throw new Error(
      `${label} must be a positive whole number.`
    );
  }

  if (
    max !== undefined &&
    number > max
  ) {
    throw new Error(
      `${label} cannot be greater than ${max}.`
    );
  }

  return number;
}

function nullableBoolean(
  value: unknown,
  label: string
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
    "boolean"
  ) {
    throw new Error(
      `${label} must be true or false.`
    );
  }

  return value;
}

export async function POST(
  request: Request
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
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

  try {
    const body =
      (await request.json()) as JsonBody;

    const integrationId =
      getText(
        body.integration_id
      );

    const tagName =
      getText(
        body.tag_name
      );

    const suppliedTagKey =
      getText(
        body.tag_key
      );

    if (
      !integrationId ||
      !tagName ||
      !suppliedTagKey
    ) {
      return NextResponse.json(
        {
          error:
            "Integration and tag are required.",
        },
        {
          status: 400,
        }
      );
    }

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
          provider,
          user_id
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
            "Smartlead connection not found.",
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
            "Rules can only be configured for Smartlead connections.",
        },
        {
          status: 400,
        }
      );
    }

    const tagKey =
      suppliedTagKey ===
      "__no_tag__"
        ? "__no_tag__"
        : normalizeTagKey(
            tagName
          );

    const messagePerDay =
      nullableInteger(
        body.message_per_day,
        "Message Per Day"
      );

    const minimumGap =
      nullableInteger(
        body.minimum_gap,
        "Minimum Gap"
      );

    const warmupEnabled =
      nullableBoolean(
        body.warmup_enabled,
        "Warmup Enabled"
      );

    const warmupDaily =
      nullableInteger(
        body.warmup_daily,
        "Warmup Daily"
      );

    const replyRate =
      nullableInteger(
        body.reply_rate,
        "Reply Rate",
        100
      );

    const isEnabled =
      body.is_enabled ===
      false
        ? false
        : true;

    const now =
      new Date()
        .toISOString();

    const {
      data: rule,
      error,
    } =
      await supabase
        .from(
          "account_type_rules"
        )
        .upsert(
          {
            user_id:
              user.id,

            integration_id:
              integrationId,

            tag_key:
              tagKey,

            tag_name:
              tagName,

            is_enabled:
              isEnabled,

            message_per_day:
              messagePerDay,

            minimum_gap:
              minimumGap,

            warmup_enabled:
              warmupEnabled,

            warmup_daily:
              warmupDaily,

            reply_rate:
              replyRate,

            updated_at:
              now,
          },
          {
            onConflict:
              "user_id,integration_id,tag_key",
          }
        )
        .select(`
          id,
          user_id,
          integration_id,
          tag_key,
          tag_name,
          is_enabled,
          message_per_day,
          minimum_gap,
          warmup_enabled,
          warmup_daily,
          reply_rate,
          daily_ramp_up,
          randomize_warmup,
          daily_target_replies,
          created_at,
          updated_at
        `)
        .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save rule.";

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