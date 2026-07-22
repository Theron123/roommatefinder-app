-- Tabla intermedia para listings importados de fuentes externas (Zumper, y a
-- futuro Yardi/RentCafe) antes de que un admin los apruebe hacia `listings`.
-- No se insertan directo en `listings` porque un sync automático corre sin
-- supervisión humana; a diferencia del importador manual de JSON en
-- app/(admin)/listings.tsx (que ya inserta directo, porque ahí un admin pegó
-- y revisó el JSON a mano antes de darle a "Importar").
create table if not exists public.listings_staging (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text,
  address text,
  description text,
  price numeric,
  currency text default 'USD',
  latitude double precision,
  longitude double precision,
  utilities_included boolean default false,
  images text[] default '{}',
  raw_payload jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_listing_id uuid references public.listings(id),
  imported_at timestamptz not null default now(),
  unique (source, external_id)
);

alter table public.listings_staging enable row level security;

-- Solo admins ven/gestionan la cola de staging desde el dashboard.
-- El sync automático usa la Service Role Key (bypasea RLS), no estas policies.
drop policy if exists "admin_select_listings_staging" on public.listings_staging;
create policy "admin_select_listings_staging"
  on public.listings_staging for select
  using ( public.is_admin(auth.uid()) );

drop policy if exists "admin_update_listings_staging" on public.listings_staging;
create policy "admin_update_listings_staging"
  on public.listings_staging for update
  using ( public.is_admin(auth.uid()) )
  with check ( public.is_admin(auth.uid()) );

drop policy if exists "admin_delete_listings_staging" on public.listings_staging;
create policy "admin_delete_listings_staging"
  on public.listings_staging for delete
  using ( public.is_admin(auth.uid()) );

create index if not exists listings_staging_review_status_idx on public.listings_staging (review_status);
