/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_META_APP_ID: string;
  /** Optional override; must match Edge Function `redirect_uri` exactly if set. */
  readonly VITE_META_REDIRECT_URI?: string;
  /** Snapchat Marketing API OAuth client id (also set `SNAPCHAT_CLIENT_ID` / secret in Supabase for Edge). */
  readonly VITE_SNAPCHAT_CLIENT_ID?: string;
  readonly VITE_SNAPCHAT_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
