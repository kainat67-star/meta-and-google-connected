/**
 * Snapchat Marketing API sync — deploy: npx supabase functions deploy snapchat-sync --no-verify-jwt
 * Optional: set SNAPCHAT_SYNC_SECRET and call with Authorization: Bearer <secret>
 * Secrets: SNAPCHAT_CLIENT_ID, SNAPCHAT_CLIENT_SECRET (for refresh)
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ADS_API = "https://adsapi.snapchat.com/v1";
const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";
const MICRO = 1_000_000;

type AdConnection = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
};

async function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`refresh failed: ${JSON.stringify(json)}`);
  const at = json.access_token;
  if (typeof at !== "string") throw new Error("refresh missing access_token");
  return {
    access_token: at,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

async function ensureFreshToken(
  admin: SupabaseClient,
  row: AdConnection,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const exp = new Date(row.token_expires_at).getTime();
  const bufferMs = 120_000;
  if (Date.now() < exp - bufferMs && row.access_token) {
    return row.access_token;
  }
  if (!row.refresh_token) {
    throw new Error("Snapchat token expired and no refresh_token stored");
  }
  const t = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: row.refresh_token,
  });
  const expiresIn = t.expires_in ?? 3600;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await admin
    .from("ad_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? row.refresh_token,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id)
    .eq("platform", "snapchat");
  return t.access_token;
}

async function apiGet(accessToken: string, path: string): Promise<unknown> {
  const res = await fetch(`${ADS_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GET ${path}: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

function isoRangeLast30Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function dayFromIso(iso: string): string {
  return iso.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const cronSecret = Deno.env.get("SNAPCHAT_SYNC_SECRET")?.trim();
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("SNAPCHAT_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("SNAPCHAT_CLIENT_SECRET") ?? "";

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "Missing SNAPCHAT_CLIENT_ID or SNAPCHAT_CLIENT_SECRET" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: rows, error: qErr } = await admin
    .from("ad_connections")
    .select("user_id, access_token, refresh_token, token_expires_at")
    .eq("platform", "snapchat");

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), { status: 500 });
  }

  const list = (rows ?? []) as AdConnection[];
  const results: { user_id: string; ok: boolean; detail?: string; rowsUpserted?: number }[] = [];

  for (const row of list) {
    try {
      const accessToken = await ensureFreshToken(admin, row, clientId, clientSecret);
      const n = await syncSnapchatUser(admin, row.user_id, accessToken);
      results.push({ user_id: row.user_id, ok: true, rowsUpserted: n });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("snapchat-sync user", row.user_id, msg);
      results.push({ user_id: row.user_id, ok: false, detail: msg });
    }
  }

  return new Response(JSON.stringify({ synced: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function syncSnapchatUser(
  admin: SupabaseClient,
  userId: string,
  accessToken: string,
): Promise<number> {
  let orgJson: unknown;
  try {
    orgJson = await apiGet(accessToken, "/me/organizations?with_ad_accounts=true");
  } catch {
    orgJson = await apiGet(accessToken, "/me/organizations");
  }

  const orgs = (orgJson as { organizations?: unknown[] }).organizations ?? [];
  let upserted = 0;
  const { start, end } = isoRangeLast30Days();

  for (const o of orgs) {
    const org = (o as { organization?: Record<string, unknown> }).organization;
    const orgId = typeof org?.id === "string" ? org.id : null;
    if (!orgId) continue;

    const embedded = org?.ad_accounts;
    let accountIds: string[] = [];
    if (Array.isArray(embedded)) {
      for (const acc of embedded) {
        const id = (acc as { id?: string })?.id;
        if (typeof id === "string") accountIds.push(id);
      }
    }

    if (accountIds.length === 0) {
      let adAccountsJson: unknown;
      try {
        adAccountsJson = await apiGet(accessToken, `/adaccounts?organization_id=${encodeURIComponent(orgId)}`);
      } catch {
        adAccountsJson = await apiGet(accessToken, `/organizations/${encodeURIComponent(orgId)}/adaccounts`);
      }
      const raw = (adAccountsJson as { adaccounts?: unknown[] }).adaccounts ?? [];
      for (const a of raw) {
        const nested = (a as { adaccount?: { id?: string } }).adaccount?.id;
        const flat = (a as { id?: string }).id;
        const id = nested ?? flat;
        if (typeof id === "string") accountIds.push(id);
      }
    }

    for (const adAccountId of accountIds) {

      let campaignsJson: unknown;
      try {
        campaignsJson = await apiGet(accessToken, `/adaccounts/${encodeURIComponent(adAccountId)}/campaigns`);
      } catch (e) {
        console.error("campaigns list", adAccountId, e);
        continue;
      }

      const campaigns =
        (campaignsJson as { campaigns?: { campaign?: Record<string, unknown> }[] }).campaigns ?? [];

      for (const c of campaigns) {
        const camp = c.campaign;
        if (!camp?.id) continue;
        const campaignId = String(camp.id);
        const campaignName = typeof camp.name === "string" ? camp.name : "";
        const adSquadId =
          typeof camp.ad_squad_id === "string"
            ? camp.ad_squad_id
            : typeof camp.squad_id === "string"
              ? camp.squad_id
              : null;

        let statsJson: unknown;
        try {
          const q = new URLSearchParams({
            granularity: "DAY",
            start_time: start,
            end_time: end,
            fields: "impressions,swipes,spend,view_completion",
          });
          statsJson = await apiGet(
            accessToken,
            `/campaigns/${encodeURIComponent(campaignId)}/stats?${q.toString()}`,
          );
        } catch (e) {
          console.error("campaign stats", campaignId, e);
          continue;
        }

        const rows = parseCampaignStats(statsJson, campaignId, campaignName, adSquadId, userId);
        if (rows.length === 0) continue;

        const { error: upErr } = await admin.from("ad_metrics").upsert(rows, {
          onConflict: "user_id,platform,campaign_id,date",
        });
        if (upErr) {
          console.error("ad_metrics upsert", upErr);
        } else {
          upserted += rows.length;
        }
      }
    }
  }

  return upserted;
}

function parseCampaignStats(
  statsJson: unknown,
  campaignId: string,
  campaignName: string,
  adSquadId: string | null,
  userId: string,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const root = statsJson as {
    timeseries_stats?: {
      start_time?: string;
      end_time?: string;
      stats?: Record<string, unknown>;
      total_stats?: Record<string, unknown>;
    }[];
    total_stats?: Record<string, unknown>;
  };

  const series = root.timeseries_stats ?? [];

  if (series.length > 0) {
    for (const day of series) {
      const st = day.start_time ?? day.end_time;
      if (!st) continue;
      const date = dayFromIso(st);
      const s = day.stats ?? day.total_stats ?? {};
      out.push(metricsRow(userId, campaignId, campaignName, adSquadId, date, s));
    }
    return out;
  }

  if (root.total_stats) {
    const date = dayFromIso(new Date().toISOString());
    out.push(metricsRow(userId, campaignId, campaignName, adSquadId, date, root.total_stats));
  }

  return out;
}

function metricsRow(
  userId: string,
  campaignId: string,
  campaignName: string,
  adSquadId: string | null,
  date: string,
  stats: Record<string, unknown>,
): Record<string, unknown> {
  const impressions = num(stats.impressions);
  const swipes = num(stats.swipes);
  const spendMicro = num(stats.spend);
  const spendUsd = spendMicro != null ? spendMicro / MICRO : null;

  return {
    user_id: userId,
    platform: "snapchat",
    campaign_id: campaignId,
    campaign_name: campaignName || null,
    ad_squad_id: adSquadId,
    date,
    spend: spendUsd,
    impressions: impressions != null ? Math.round(impressions) : null,
    clicks: swipes != null ? Math.round(swipes) : null,
    conversions: null,
    revenue: null,
    updated_at: new Date().toISOString(),
  };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
