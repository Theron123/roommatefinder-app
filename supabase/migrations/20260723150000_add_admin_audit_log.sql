-- El log de auditoría del admin hoy solo vive en AsyncStorage del dispositivo
-- (app/(admin)/roles.tsx, users.tsx, contracts.tsx, listings.tsx) — se pierde
-- al cambiar de teléfono/navegador y, peor, dos pantallas distintas (roles.tsx
-- y users.tsx) guardan el historial del mismo usuario bajo claves de
-- AsyncStorage diferentes, así que ni siquiera comparten historial entre sí
-- hoy. Esta tabla centraliza el registro en Supabase para las 3 entidades que
-- ya se auditaban: usuarios, propiedades y contratos.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  entity_type text not null check (entity_type in ('user', 'property', 'contract')),
  entity_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- Solo admins pueden ver o escribir el historial de auditoría.
drop policy if exists "admin_select_admin_audit_log" on public.admin_audit_log;
create policy "admin_select_admin_audit_log"
  on public.admin_audit_log for select
  using ( public.is_admin(auth.uid()) );

drop policy if exists "admin_insert_admin_audit_log" on public.admin_audit_log;
create policy "admin_insert_admin_audit_log"
  on public.admin_audit_log for insert
  with check ( public.is_admin(auth.uid()) );

create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id, created_at desc);
