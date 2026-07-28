-- Pago de renta mensual real vía Stripe (modo `payment`, no `subscription`):
-- el usuario entra y paga cada mes a mano. El monto varía según el listing,
-- así que no hay un Price fijo de Stripe — se usa price_data dinámico en el
-- Checkout Session (ver supabase/functions/create-checkout-session).
--
-- stripe_subscription_id queda nullable a propósito: hoy siempre es null
-- (pago manual), pero el esquema ya soporta que una fila de renta pase a
-- recurrente en una fase futura sin necesitar otra migración.
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  -- Formato 'YYYY-MM'. Junto con user_id + listing_id identifica de forma
  -- única el pago de renta de un mes dado, para que el webhook sepa qué fila
  -- actualizar sin depender del id de la Checkout Session.
  period text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_id, period)
);

alter table public.rent_payments enable row level security;

-- El usuario solo LEE sus propios pagos. Igual que subscriptions: el estado
-- real (pending -> paid/failed) solo lo escribe el webhook de Stripe vía
-- Service Role Key, nunca el cliente directamente.
drop policy if exists "users_select_own_rent_payments" on public.rent_payments;
create policy "users_select_own_rent_payments"
  on public.rent_payments for select
  using ( auth.uid() = user_id );

drop policy if exists "admin_select_all_rent_payments" on public.rent_payments;
create policy "admin_select_all_rent_payments"
  on public.rent_payments for select
  using ( public.is_admin(auth.uid()) );

create index if not exists rent_payments_user_id_idx on public.rent_payments (user_id);
create index if not exists rent_payments_listing_id_idx on public.rent_payments (listing_id);
create index if not exists rent_payments_stripe_customer_idx on public.rent_payments (stripe_customer_id);
