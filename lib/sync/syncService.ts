import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/integrationCrypto";

export type JsonObject = Record<string, unknown>;

export type AccountType =
  | "Hypertide Azure/Entra"
  | "Hypertide Google"
  | "Hypertide Google for SendGrid Upload"
  | "Google Workspace"
  | "No Tag";

export type SmartleadClient = {
  id: number;
  name: string;
};

export type SyncResult = {
  integrationId: string;
  provider: string;
  success: boolean;
  accountsFetched?: number;
  campaignsFetched?: number;
  domainsFetched?: number;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function getArray(value: unknown): JsonObject[] {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object").map((item) => item as JsonObject);
  }
  return [];
}

function getString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function getAccountTagNames(account: JsonObject): string[] {
  const tags = getArray(account.tags);
  return tags
    .map((tag) => getString(tag.tag_name) || getString(tag.name))
    .filter((tag): tag is string => Boolean(tag));
}

export function classifyAccountType(account: JsonObject): AccountType | null {
  const tags = getAccountTagNames(account).map((tag) => tag.trim().toLowerCase());

  if (tags.length === 0) {
    return "No Tag";
  }

  if (tags.includes("hypertide google for sendgrid upload")) {
    return "Hypertide Google for SendGrid Upload";
  }

  if (tags.includes("hypertide google")) {
    return "Hypertide Google";
  }

  if (
    tags.includes("hypertide azure/entra") ||
    tags.includes("hypertide p1 only") ||
    tags.includes("hypertide p2 only") ||
    tags.includes("hypertide azure") ||
    tags.includes("hypertide entra")
  ) {
    return "Hypertide Azure/Entra";
  }

  if (tags.includes("google workspace")) {
    return "Google Workspace";
  }

  return null;
}

async function fetchJsonWithRetry(url: string, timeoutMs = 25000) {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      lastStatus = response.status;

      if (response.ok) {
        return response.json();
      }

      if (response.status !== 429 && response.status < 500) {
        const body = await response.text();
        throw new Error(`API request failed with ${response.status}: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      if (attempt === 2) throw err;
    }

    const delay = 800 * Math.pow(2, attempt);
    await sleep(delay);
  }

  throw new Error(`API request failed after retries. Last status: ${lastStatus}`);
}

async function fetchAllEmailAccounts(apiKey: string): Promise<JsonObject[]> {
  const allAccounts: JsonObject[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const url = new URL("https://server.smartlead.ai/api/v1/email-accounts/");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));

    const json = await fetchJsonWithRetry(url.toString());
    const page = getArray(json);

    allAccounts.push(...page);

    if (page.length < limit) {
      break;
    }

    offset += limit;

    if (offset > 50000) {
      break;
    }
  }

  return allAccounts;
}

async function fetchCampaigns(apiKey: string): Promise<JsonObject[]> {
  try {
    const url = new URL("https://server.smartlead.ai/api/v1/campaigns/");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("include_tags", "true");

    const json = await fetchJsonWithRetry(url.toString(), 20000);
    return getArray(json);
  } catch (err) {
    console.warn("fetchCampaigns warning:", err);
    return [];
  }
}

async function fetchClients(apiKey: string): Promise<SmartleadClient[]> {
  const endpoints = [
    "https://server.smartlead.ai/api/v1/analytics/client/list",
    "https://server.smartlead.ai/api/v1/client/",
  ];

  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("api_key", apiKey);

      const json = await fetchJsonWithRetry(url.toString(), 15000);
      const rows = getArray(json);

      const clients: SmartleadClient[] = rows
        .map((row) => {
          const id = getNumber(row.id) ?? getNumber(row.client_id);
          const name = getString(row.name) || getString(row.client_name);
          if (id === null || !name) return null;
          return { id, name };
        })
        .filter((c): c is SmartleadClient => c !== null);

      if (clients.length > 0) {
        return clients;
      }
    } catch {
      // try next endpoint
    }
  }

  return [];
}

function buildClientMap(clients: SmartleadClient[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const client of clients) {
    map.set(client.id, client.name);
  }
  return map;
}

function enrichWithClient(account: JsonObject, clientMap: Map<number, string>): JsonObject {
  const cloned = { ...account };
  const clientId = getNumber(account.client_id);

  if (clientId !== null && clientMap.has(clientId)) {
    cloned.client_name = clientMap.get(clientId);
  }

  return cloned;
}

/**
 * Syncs a single Smartlead integration.
 */
export async function syncSmartleadIntegration(integration: {
  id: string;
  user_id: string;
  encrypted_api_key?: string | null;
}): Promise<SyncResult> {
  const supabase = createAdminClient();

  if (!integration.encrypted_api_key) {
    throw new Error("Smartlead encrypted API key is missing.");
  }

  const apiKey = decryptApiKey(integration.encrypted_api_key);

  const [accounts, campaigns, clients] = await Promise.all([
    fetchAllEmailAccounts(apiKey),
    fetchCampaigns(apiKey),
    fetchClients(apiKey),
  ]);

  const clientMap = buildClientMap(clients);
  const now = new Date().toISOString();

  // 1. Process and upsert email accounts
  const accountRows = accounts
    .map((account) => {
      const externalId = getNumber(account.id);
      if (externalId === null) return null;

      const accountType = classifyAccountType(account);
      const enrichedRawData = enrichWithClient(account, clientMap);

      return {
        user_id: integration.user_id,
        integration_id: integration.id,
        external_id: externalId,
        email: getString(account.from_email) || getString(account.email) || getString(account.username),
        from_name: getString(account.from_name),
        username: getString(account.username),
        account_type: accountType,
        raw_data: enrichedRawData,
        synced_at: now,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (accountRows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < accountRows.length; i += chunkSize) {
      const chunk = accountRows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("email_accounts")
        .upsert(chunk, { onConflict: "integration_id,external_id" });

      if (error) {
        throw new Error(`Email account save failed: ${error.message}`);
      }
    }
  }

  // 2. Process campaigns (if returned)
  let activeCampaigns = 0;
  if (campaigns.length > 0) {
    const campaignRows = campaigns
      .map((c) => {
        const extId = getNumber(c.id);
        if (extId === null) return null;

        const status = getString(c.status) || "DRAFT";
        if (status.toUpperCase() === "ACTIVE") activeCampaigns++;

        return {
          user_id: integration.user_id,
          integration_id: integration.id,
          external_id: extId,
          name: getString(c.name) || "Unnamed Campaign",
          status,
          raw_data: c,
          synced_at: now,
          updated_at: now,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (campaignRows.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < campaignRows.length; i += chunkSize) {
        const chunk = campaignRows.slice(i, i + chunkSize);
        try {
          await supabase
            .from("campaigns")
            .upsert(chunk, { onConflict: "integration_id,external_id" });
        } catch (err) {
          console.warn("Campaign save error:", err);
        }
      }
    }
  }

  // 3. Process clients
  if (clients.length > 0) {
    const clientRows = clients.map((c) => ({
      user_id: integration.user_id,
      integration_id: integration.id,
      external_id: c.id,
      name: c.name,
      synced_at: now,
      updated_at: now,
    }));

    try {
      await supabase
        .from("clients")
        .upsert(clientRows, { onConflict: "integration_id,external_id" });
    } catch (err) {
      console.warn("Clients save error:", err);
    }
  }

  // 4. Update integration status
  await supabase
    .from("integrations")
    .update({
      status: "connected",
      last_synced_at: now,
    })
    .eq("id", integration.id);

  // 5. Insert sync log
  try {
    await supabase.from("sync_logs").insert({
      user_id: integration.user_id,
      integration_id: integration.id,
      provider: "smartlead",
      accounts_fetched: accountRows.length,
      campaigns_fetched: campaigns.length,
      active_campaigns: activeCampaigns,
      domains_fetched: 0,
      status: "success",
      message: `Smartlead sync completed: ${accountRows.length} accounts, ${campaigns.length} campaigns, ${clients.length} clients.`,
    });
  } catch (err) {
    console.warn("Sync log error:", err);
  }

  return {
    integrationId: integration.id,
    provider: "smartlead",
    success: true,
    accountsFetched: accountRows.length,
    campaignsFetched: campaigns.length,
  };
}

/**
 * Syncs a single EmailGuard integration.
 */
export async function syncEmailguardIntegration(integration: {
  id: string;
  user_id: string;
  encrypted_api_key?: string | null;
}): Promise<SyncResult> {
  const supabase = createAdminClient();

  if (!integration.encrypted_api_key) {
    throw new Error("EmailGuard encrypted API key is missing.");
  }

  const apiKey = decryptApiKey(integration.encrypted_api_key);

  const response = await fetch("https://app.emailguard.io/api/v1/domains", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailGuard request failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const json = await response.json();
  const rawDomains = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const now = new Date().toISOString();

  const domainRows = rawDomains
    .map((item: JsonObject) => {
      const domainName = getString(item.domain) || getString(item.name);
      if (!domainName) return null;

      return {
        user_id: integration.user_id,
        integration_id: integration.id,
        domain: domainName,
        client: getString(item.client) || getString(item.client_name) || "Unassigned",
        spf_status: getString(item.spf_status) || getString(item.spf) || "unknown",
        dkim_status: getString(item.dkim_status) || getString(item.dkim) || "unknown",
        dmarc_status: getString(item.dmarc_status) || getString(item.dmarc) || "unknown",
        dmarc_policy: getString(item.dmarc_policy) || "none",
        reporting_status: getString(item.reporting_status) || "inactive",
        overall_status: getString(item.overall_status) || getString(item.status) || "healthy",
        raw_data: item,
        synced_at: now,
        updated_at: now,
      };
    })
    .filter((row: any): row is NonNullable<typeof row> => row !== null);

  if (domainRows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < domainRows.length; i += chunkSize) {
      const chunk = domainRows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("domains")
        .upsert(chunk, { onConflict: "integration_id,domain" });

      if (error) {
        throw new Error(`Domain save failed: ${error.message}`);
      }
    }
  }

  await supabase
    .from("integrations")
    .update({
      status: "connected",
      last_synced_at: now,
    })
    .eq("id", integration.id);

  try {
    await supabase.from("sync_logs").insert({
      user_id: integration.user_id,
      integration_id: integration.id,
      provider: "emailguard",
      accounts_fetched: 0,
      campaigns_fetched: 0,
      active_campaigns: 0,
      domains_fetched: domainRows.length,
      status: "success",
      message: `EmailGuard sync completed: ${domainRows.length} domains.`,
    });
  } catch (err) {
    console.warn("Sync log error:", err);
  }

  return {
    integrationId: integration.id,
    provider: "emailguard",
    success: true,
    domainsFetched: domainRows.length,
  };
}

/**
 * Syncs all active integrations for a user.
 * Each integration is isolated so a failure in one does not block others.
 */
export async function syncAllUserIntegrations(userId: string): Promise<SyncResult[]> {
  const supabase = createAdminClient();

  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("id, user_id, provider, status, encrypted_api_key")
    .eq("user_id", userId)
    .neq("status", "disabled");

  if (error || !integrations || integrations.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];

  for (const integration of integrations) {
    try {
      if (integration.provider === "smartlead") {
        const res = await syncSmartleadIntegration(integration);
        results.push(res);
      } else if (integration.provider === "emailguard") {
        const res = await syncEmailguardIntegration(integration);
        results.push(res);
      }
    } catch (syncErr) {
      const errorMsg = syncErr instanceof Error ? syncErr.message : "Sync failed";
      console.warn(`Sync failed for integration ${integration.id} (${integration.provider}):`, errorMsg);

      // Record failure in sync log & update status
      try {
        await supabase
          .from("integrations")
          .update({ status: "error" })
          .eq("id", integration.id);
      } catch {
        // ignore
      }

      try {
        await supabase.from("sync_logs").insert({
          user_id: integration.user_id,
          integration_id: integration.id,
          provider: integration.provider,
          accounts_fetched: 0,
          campaigns_fetched: 0,
          active_campaigns: 0,
          domains_fetched: 0,
          status: "failed",
          message: errorMsg.slice(0, 500),
        });
      } catch {
        // ignore
      }

      results.push({
        integrationId: integration.id,
        provider: integration.provider,
        success: false,
        error: errorMsg,
      });
    }
  }

  return results;
}

