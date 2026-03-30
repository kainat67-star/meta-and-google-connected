/**
 * Snapchat OAuth redirect_uri — must match:
 * - Snapchat Developer Portal → OAuth redirect URI
 * - `redirect_uri` in the code→token exchange (Edge Function `snapchat-auth`)
 *
 * Derived from `VITE_SUPABASE_URL` so it stays aligned with `SUPABASE_URL` on Edge.
 */
export function getSnapchatOAuthRedirectUri(): string {
  const explicit = import.meta.env.VITE_SNAPCHAT_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const base = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("Missing VITE_SUPABASE_URL (needed to build Snapchat OAuth redirect_uri)");
  }
  return `${base}/functions/v1/snapchat-auth`;
}
