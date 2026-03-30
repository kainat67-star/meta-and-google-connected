/**
 * Snapchat OAuth — deploy: npx supabase functions deploy snapchat-auth --no-verify-jwt
 * Secrets: SNAPCHAT_CLIENT_ID, SNAPCHAT_CLIENT_SECRET (or reuse names from env)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getOAuthCallbackSearchParams } from "../_shared/oauth-callback.ts";

const SNAP_AUTH = "https://accounts.snapchat.com/login/oauth2/authorize";
const SNAP_TOKEN = "https://accounts.snapchat.com/login/oauth2/access_token";
const SCOPES = "snapchat-marketing-api";

function snapchatRedirectUri(): string {
  const explicit = Deno.env.get("SNAPCHAT_REDIRECT_URI")?.trim();
  if (explicit) return explicit;
  const base = Deno.env.get("SUPABASE_URL")?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("SUPABASE_URL is not set");
  return `${base}/functions/v1/snapchat-auth`;
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

function buildAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL(SNAP_AUTH);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("state", params.state);
  return u.href;
}

async function exchangeAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const res = await fetch(SNAP_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }
  const access = json.access_token;
  if (typeof access !== "string") throw new Error("Snapchat token response missing access_token");
  return {
    access_token: access,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

Deno.serve(async (req) => {
  try {
    return await handleSnapchatAuth(req);
  } catch (e) {
    console.error("snapchat-auth error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "snapchat-auth failed", detail: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleSnapchatAuth(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("SNAPCHAT_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("SNAPCHAT_CLIENT_SECRET") ?? "";
  const dashboardBase =
    Deno.env.get("DASHBOARD_BASE_URL")?.trim().replace(/\/+$/, "") ?? "https://neo-weld.vercel.app";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const redirectUri = snapchatRedirectUri();
  const admin = createClient(supabaseUrl, serviceKey);

  if (req.method === "POST") {
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Missing SNAPCHAT_CLIENT_ID or SNAPCHAT_CLIENT_SECRET" }), {
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
      .from("snapchat_oauth_states")
      .insert({ user_id: userData.user.id })
      .select("id")
      .single();

    if (insErr || !stateRow?.id) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Could not create OAuth state" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const url = buildAuthorizeUrl({
      clientId,
      redirectUri,
      state: stateRow.id,
    });

    return new Response(JSON.stringify({ url, redirect_uri: redirectUri }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    const params = getOAuthCallbackSearchParams(req, supabaseUrl);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    const errDesc = params.get("error_description");

    if (err) {
      return Response.redirect(
        `${dashboardBase}/settings?snapchat_error=${encodeURIComponent(errDesc ?? err)}`,
        302,
      );
    }

    if (!code || !state) {
      return Response.redirect(`${dashboardBase}/settings?snapchat_error=missing_code_or_state`, 302);
    }

    if (!clientId || !clientSecret) {
      return Response.redirect(`${dashboardBase}/settings?snapchat_error=server_misconfigured`, 302);
    }

    const { data: stateRow, error: stateErr } = await admin
      .from("snapchat_oauth_states")
      .select("id, user_id, consumed_at")
      .eq("id", state)
      .maybeSingle();

    if (stateErr || !stateRow || stateRow.consumed_at) {
      return Response.redirect(`${dashboardBase}/settings?snapchat_error=invalid_state`, 302);
    }

    let tokens: { access_token: string; refresh_token?: string; expires_in?: number };
    try {
      tokens = await exchangeAuthorizationCode({
        clientId,
        clientSecret,
        redirectUri,
        code,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.redirect(
        `${dashboardBase}/settings?snapchat_error=${encodeURIComponent(`token_exchange:${msg}`)}`,
        302,
      );
    }

    const expiresInSec = tokens.expires_in ?? 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const { error: upsertErr } = await admin.from("ad_connections").upsert(
      {
        user_id: stateRow.user_id,
        platform: "snapchat",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: tokenExpiresAt,
        meta_user_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );

    if (upsertErr) {
      return Response.redirect(
        `${dashboardBase}/settings?snapchat_error=${encodeURIComponent(upsertErr.message)}`,
        302,
      );
    }

    await admin.from("snapchat_oauth_states").update({ consumed_at: new Date().toISOString() }).eq("id", state);

    return Response.redirect(`${dashboardBase}/settings?snapchat_connected=1`, 302);
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });
}
