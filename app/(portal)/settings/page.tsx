import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import SettingsPageClient from "@/components/SettingsPageClient";

import type {
  AccountTypeRule,
  DiscoveredAccountTag,
} from "@/components/AccountRulesSettingsClient";

type RawData = Record<string, unknown>;

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
    typeof value !== "string"
  ) {
    return null;
  }

  const text = value.trim();

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

function getAccountTags(
  rawData: unknown
) {
  const raw =
    asObject(rawData);

  if (
    !Array.isArray(raw.tags)
  ) {
    return [];
  }

  const names =
    raw.tags
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return getText(item);
        }

        const tag =
          asObject(item);

        return (
          getText(
            tag.tag_name
          ) ||
          getText(
            tag.name
          )
        );
      })
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      );

  /*
   * Remove duplicate tags
   * from the same account.
   */
  return Array.from(
    new Set(names)
  );
}

export default async function SettingsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    integrationsResult,
    recipientsResult,
    rulesResult,
  ] =
    await Promise.all([
      supabase
        .from("integrations")
        .select(`
          id,
          provider,
          name,
          status,
          api_key_last4,
          last_synced_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          "notification_recipients"
        )
        .select(`
          id,
          email,
          instant_issue_alert,
          daily_report,
          is_active,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "account_type_rules"
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
        .eq(
          "user_id",
          user.id
        )
        .order(
          "tag_name",
          {
            ascending: true,
          }
        ),
    ]);

  if (
    integrationsResult.error
  ) {
    throw new Error(
      integrationsResult
        .error.message
    );
  }

  if (
    recipientsResult.error
  ) {
    throw new Error(
      recipientsResult
        .error.message
    );
  }

  if (
    rulesResult.error
  ) {
    throw new Error(
      rulesResult
        .error.message
    );
  }

  const integrations =
    integrationsResult.data ||
    [];

  const smartleadIntegrations =
    integrations.filter(
      (integration) =>
        integration.provider ===
        "smartlead"
    );

  const accountRows: {
    integration_id: string;
    raw_data: unknown;
  }[] = [];

  /*
   * Supabase returns a limited
   * number of rows per request,
   * so load every account in pages.
   */
  for (
    const integration of
    smartleadIntegrations
  ) {
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "email_accounts"
          )
          .select(`
            integration_id,
            raw_data
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "integration_id",
            integration.id
          )
          .range(
            from,
            from +
              pageSize -
              1
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const page =
        data || [];

      accountRows.push(
        ...page
      );

      if (
        page.length <
        pageSize
      ) {
        break;
      }

      from += pageSize;
    }
  }

  const integrationNames =
    new Map(
      smartleadIntegrations.map(
        (integration) => [
          integration.id,
          integration.name,
        ]
      )
    );

  const discoveredTagMap =
    new Map<
      string,
      DiscoveredAccountTag
    >();

  for (
    const account of
    accountRows
  ) {
    const accountTags =
      getAccountTags(
        account.raw_data
      );

    /*
     * Smartlead's "No Tag"
     * filter is represented here
     * using a synthetic key.
     */
    const tags =
      accountTags.length > 0
        ? accountTags.map(
            (tagName) => ({
              tagKey:
                normalizeTagKey(
                  tagName
                ),
              tagName,
            })
          )
        : [
            {
              tagKey:
                "__no_tag__",
              tagName:
                "No Tag",
            },
          ];

    for (
      const tag of tags
    ) {
      const mapKey =
        `${account.integration_id}::${tag.tagKey}`;

      const existing =
        discoveredTagMap.get(
          mapKey
        );

      if (existing) {
        existing.account_count +=
          1;

        continue;
      }

      discoveredTagMap.set(
        mapKey,
        {
          integration_id:
            account.integration_id,

          integration_name:
            integrationNames.get(
              account.integration_id
            ) ||
            "Smartlead",

          tag_key:
            tag.tagKey,

          tag_name:
            tag.tagName,

          account_count: 1,
        }
      );
    }
  }

  const discoveredTags =
    Array.from(
      discoveredTagMap.values()
    ).sort((a, b) => {
      const integrationCompare =
        a.integration_name.localeCompare(
          b.integration_name
        );

      if (
        integrationCompare !==
        0
      ) {
        return integrationCompare;
      }

      return a.tag_name.localeCompare(
        b.tag_name
      );
    });

  return (
    <SettingsPageClient
      userId={user.id}
      integrations={
        integrations
      }
      recipients={
        recipientsResult.data ||
        []
      }
      discoveredTags={
        discoveredTags
      }
      rules={
        (rulesResult.data ||
          []) as AccountTypeRule[]
      }
    />
  );
}