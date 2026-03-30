-- Snapchat OAuth state (POST /snapchat-auth start → GET callback)
create table if not exists public.snapchat_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists snapchat_oauth_states_created_at_idx on public.snapchat_oauth_states (created_at desc);

alter table public.snapchat_oauth_states enable row level security;

-- Refresh token for OAuth providers that use it (e.g. Snapchat)
alter table public.ad_connections
  add column if not exists refresh_token text;

-- Daily campaign metrics (Meta, Snapchat, etc.)
create table if not exists public.ad_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  campaign_id text not null,
  campaign_name text,
  ad_squad_id text,
  date date not null,
  spend numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  revenue numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, campaign_id, date)
);

create index if not exists ad_metrics_user_platform_date_idx on public.ad_metrics (user_id, platform, date desc);

alter table public.ad_metrics enable row level security;
