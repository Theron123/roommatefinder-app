-- Reemplaza el paywall falso de app/subscriptions.tsx (un switch que escribía
-- directo a profiles.share_badges_enabled) por una suscripción real respaldada
-- por Stripe. Deliberadamente NO se reutiliza share_badges_enabled: ese campo
-- ya se usa para dos cosas sin relación (preferencia de privacidad del propio
-- usuario en app/settings/privacy.tsx, y un flag de "VIP" que pone el admin en
-- app/(admin)/users.tsx) — apagar tu privacidad de insignias no debe apagarte
-- el premium real que pagaste, así que el estado de suscripción vive en su
-- propia tabla.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  -- Mismos valores que usa Stripe para el status de una subscription:
  -- https://docs.stripe.com/api/subscriptions/object#subscription_object-status
  status text not null default 'incomplete' check (
    status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')
  ),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (stripe_subscription_id)
);

alter table public.subscriptions enable row level security;

-- El usuario solo puede LEER su propia fila. Nunca escribe directo — el
-- estado real solo lo actualiza el webhook de Stripe (Service Role Key,
-- bypasea RLS) o create-checkout-session al crear la fila inicial.
drop policy if exists "users_select_own_subscription" on public.subscriptions;
create policy "users_select_own_subscription"
  on public.subscriptions for select
  using ( auth.uid() = user_id );

drop policy if exists "admin_select_all_subscriptions" on public.subscriptions;
create policy "admin_select_all_subscriptions"
  on public.subscriptions for select
  using ( public.is_admin(auth.uid()) );

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions (stripe_customer_id);
