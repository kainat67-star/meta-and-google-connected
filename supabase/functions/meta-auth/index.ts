/**
 * Meta OAuth callback (GET ?code=&state=) has **no** Supabase JWT. The deployed function MUST run with
 * JWT verification disabled, or the gateway rejects the request before this code runs:
 *   supabase functions deploy meta-auth --no-verify-jwt
 * or [functions.meta-auth] verify_jwt = false in supabase/config.toml (then deploy).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getOAuthCallbackSearchParams } from "../_shared/oauth-callback.ts";

const FB_API_VERSION = "v21.0";

function metaOAuthRedirectUri(): string {
  const explicit = Deno.env.get("META_REDIRECT_URI")?.trim();
  if (explicit) return explicit;
  const base = Deno.env.get("SUPABASE_URL")?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("SUPABASE_URL is not set");
  return `${base}/functions/v1/meta-auth`;
}

function metaScopes(): string {
  return [
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "pages_show_list",
  ].join(",");
}

function buildMetaAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(`https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", metaScopes());
  return u.href;
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Max-Age": "86400",
  };
}

async function exchangeCodeForShortLivedToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const u = new URL(`https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("client_secret", params.clientSecret);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("code", params.code);
  const res = await fetch(u);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof json.error === "object" && json.error && "message" in (json.error as object)
        ? String((json.error as { message?: string }).message)
        : JSON.stringify(json),
    );
  }
  const token = json.access_token;
  if (typeof token !== "string") throw new Error("Meta token response missing access_token");
  return {
    access_token: token,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

async function exchangeForLongLivedToken(params: {
  clientId: string;
  clientSecret: string;
  shortLivedToken: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const u = new URL(`https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`);
  u.searchParams.set("grant_type", "fb_exchange_token");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("client_secret", params.clientSecret);
  u.searchParams.set("fb_exchange_token", params.shortLivedToken);
  const res = await fetch(u);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }
  const token = json.access_token;
  if (typeof token !== "string") throw new Error("Meta long-lived response missing access_token");
  return {
    access_token: token,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

async function fetchMetaUserId(accessToken: string): Promise<string> {
  const u = new URL(`https://graph.facebook.com/${FB_API_VERSION}/me`);
  u.searchParams.set("fields", "id");
  u.searchParams.set("access_token", accessToken);
  const res = await fetch(u);
  const json = (await res.json()) as { id?: string; error?: unknown };
  if (!res.ok || !json.id) throw new Error(JSON.stringify(json.error ?? json));
  return json.id;
}

Deno.serve(async (req) => {
  try {
    return await handleMetaAuth(req);
  } catch (e) {
    console.error("meta-auth error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "meta-auth failed", detail: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleMetaAuth(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const metaAppId = Deno.env.get("META_APP_ID") ?? Deno.env.get("FACEBOOK_APP_ID");
  const metaSecret = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("FACEBOOK_APP_SECRET");
  const dashboardBase =
    Deno.env.get("DASHBOARD_BASE_URL")?.trim().replace(/\/+$/, "") ?? "https://neo-weld.vercel.app";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const redirectUri = metaOAuthRedirectUri();
  const admin = createClient(supabaseUrl, serviceKey);

  // --- POST: start OAuth (returns Meta authorize URL; redirect_uri matches token exchange) ---
  if (req.method === "POST") {
    if (!metaAppId || !metaSecret) {
      return new Response(JSON.stringify({ error: "Missing META_APP_ID or META_APP_SECRET" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const jwt = auth.slice("Bearer ".length).trim();
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: stateRow, error: insErr } = await admin
      .from("meta_oauth_states")
      .insert({ user_id: userData.user.id })
      .select("id")
      .single();

    if (insErr || !stateRow?.id) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Could not create OAuth state" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const url = buildMetaAuthorizeUrl({
      clientId: metaAppId,
      redirectUri,
      state: stateRow.id,
    });

    return new Response(JSON.stringify({ url, redirect_uri: redirectUri }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // --- GET: Meta redirects here with ?code=&state= ---
  if (req.method === "GET") {
    const params = getOAuthCallbackSearchParams(req, supabaseUrl);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    const errDesc = params.get("error_description");

    if (err) {
      return Response.redirect(
        `${dashboardBase}/settings?meta_error=${encodeURIComponent(errDesc ?? err)}`,
        302,
      );
    }

    if (!code || !state) {
      return Response.redirect(`${dashboardBase}/settings?meta_error=missing_code_or_state`, 302);
    }

    if (!metaAppId || !metaSecret) {
      return Response.redirect(`${dashboardBase}/settings?meta_error=server_misconfigured`, 302);
    }

    const { data: stateRow, error: stateErr } = await admin
      .from("meta_oauth_states")
      .select("id, user_id, consumed_at")
      .eq("id", state)
      .maybeSingle();

    if (stateErr || !stateRow || stateRow.consumed_at) {
      return Response.redirect(`${dashboardBase}/settings?meta_error=invalid_state`, 302);
    }

    let shortLived: { access_token: string; expires_in?: number };
    try {
      shortLived = await exchangeCodeForShortLivedToken({
        clientId: metaAppId,
        clientSecret: metaSecret,
        redirectUri,
        code,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.redirect(
        `${dashboardBase}/settings?meta_error=${encodeURIComponent(`token_exchange:${msg}`)}`,
        302,
      );
    }

    let longLived: { access_token: string; expires_in?: number };
    try {
      longLived = await exchangeForLongLivedToken({
        clientId: metaAppId,
        clientSecret: metaSecret,
        shortLivedToken: shortLived.access_token,
      });
    } catch {
      longLived = shortLived;
    }

    const expiresInSec = longLived.expires_in ?? 60 * 60 * 24 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    let metaUserId: string;
    try {
      metaUserId = await fetchMetaUserId(longLived.access_token);
    } catch {
      metaUserId = "";
    }

    const { error: upsertErr } = await admin.from("ad_connections").upsert(
      {
        user_id: stateRow.user_id,
        platform: "meta",
        meta_user_id: metaUserId || null,
        access_token: longLived.access_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );

    if (upsertErr) {
      return Response.redirect(
        `${dashboardBase}/settings?meta_error=${encodeURIComponent(upsertErr.message)}`,
        302,
      );
    }

    await admin.from("meta_oauth_states").update({ consumed_at: new Date().toISOString() }).eq("id", state);

    return Response.redirect(`${dashboardBase}/settings?meta_connected=1`, 302);
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });
}
