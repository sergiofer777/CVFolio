-- Webiculum monetization + Cloudflare support
-- Fecha: 2026-02-26

begin;

-- 1) Planes de perfil: free / premium / studio
alter table public.profiles
  alter column plan type text using plan::text;

alter table public.profiles
  alter column plan set default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'premium', 'studio'));

-- 2) Uso mensual por usuario (para cuotas de generación/chat)
create table if not exists public.billing_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null, -- formato YYYY-MM (UTC)
  generation_count integer not null default 0,
  chat_iteration_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_key)
);

create index if not exists billing_usage_period_idx
  on public.billing_usage (period_key);

-- 3) Solicitudes de dominio personalizado (compra vía API/proveedor externo)
create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_domain text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  provider text,
  price_cents integer,
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domain_requests_user_id_idx
  on public.domain_requests (user_id);

create index if not exists domain_requests_status_idx
  on public.domain_requests (status);

-- 4) Suscripciones Stripe (plan Studio)
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

create unique index if not exists billing_subscriptions_customer_subscription_uidx
  on public.billing_subscriptions (stripe_customer_id, stripe_subscription_id);

commit;
