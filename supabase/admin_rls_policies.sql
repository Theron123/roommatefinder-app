-- =====================================================================
-- ⚠️ SUPERADO — NO EJECUTAR (verificado 10 de julio, 2026)
-- =====================================================================
-- Este script NUNCA se ejecutó. Se verificó directamente contra la base
-- real (vía Management API, pg_policies/pg_proc) que la protección que
-- este script buscaba dar YA EXISTE, creada desde el editor visual del
-- Dashboard de Supabase con otros nombres ("Admins can update all
-- listings", etc.) y apoyada en una función `is_admin(user_id uuid)`
-- distinta a la `is_admin()` sin argumento de abajo. Cobertura real
-- confirmada en profiles/listings/contracts/verifications/user_reports
-- y además matches/swipes (que este script ni contempla).
--
-- Correrlo ahora solo crearía una segunda función `is_admin()` sin uso y
-- políticas duplicadas. Se deja el archivo como referencia histórica de
-- cómo se pensó resolver esto. Ver antigravity_rules.md sección 3.5 para
-- el detalle completo y los nombres reales de las políticas activas.
-- =====================================================================
--
-- Políticas RLS para el rol `admin` — Roommate Finder
-- =====================================================================
-- POR QUÉ EXISTE ESTE SCRIPT:
-- El panel de administración (app/(admin)/*.tsx) hacía SELECT/UPDATE/DELETE
-- sobre filas que no pertenecen al admin (ej. suspender a otro usuario,
-- aprobar una verificación ajena, borrar un listing ajeno) usando el
-- cliente normal de Supabase (`lib/supabase.ts`, anon/authenticated key).
-- Sin políticas RLS específicas para `admin`, esas operaciones fallan o
-- quedan bloqueadas por las políticas de "solo el dueño puede escribir".
--
-- Anteriormente se intentó resolver esto embebiendo la Service Role Key
-- directamente en el bundle del cliente (lib/supabaseAdmin.ts) — una
-- vulnerabilidad grave, ya que esa key queda expuesta en el JS servido al
-- navegador y bypasea RLS por completo. Ese archivo fue eliminado.
--
-- La forma correcta es esta: políticas RLS explícitas que permiten a un
-- usuario cuyo `profiles.role = 'admin'` operar sobre las tablas
-- necesarias, sin exponer ninguna key privilegiada al cliente.
--
-- CÓMO EJECUTAR:
-- 1. Entra al Dashboard de Supabase → SQL Editor.
-- 2. Pega y ejecuta este script completo (es idempotente, se puede correr
--    varias veces sin duplicar políticas).
-- 3. Verifica en Authentication > Policies que las políticas "admin_*"
--    aparezcan en cada tabla.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Función helper: ¿el usuario autenticado actual es admin?
-- ---------------------------------------------------------------------
-- SECURITY DEFINER evita recursión infinita de RLS al consultar `profiles`
-- desde dentro de una policy de la propia tabla `profiles`.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. profiles — admin puede leer y actualizar cualquier perfil
--    (suspender/reactivar usuarios, editar flags de verificación, etc.)
-- ---------------------------------------------------------------------
drop policy if exists "admin_select_all_profiles" on public.profiles;
create policy "admin_select_all_profiles"
  on public.profiles for select
  using ( public.is_admin() );

drop policy if exists "admin_update_all_profiles" on public.profiles;
create policy "admin_update_all_profiles"
  on public.profiles for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ---------------------------------------------------------------------
-- 3. listings — admin puede leer, actualizar y borrar cualquier anuncio
-- ---------------------------------------------------------------------
drop policy if exists "admin_select_all_listings" on public.listings;
create policy "admin_select_all_listings"
  on public.listings for select
  using ( public.is_admin() );

drop policy if exists "admin_update_all_listings" on public.listings;
create policy "admin_update_all_listings"
  on public.listings for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

drop policy if exists "admin_delete_all_listings" on public.listings;
create policy "admin_delete_all_listings"
  on public.listings for delete
  using ( public.is_admin() );

-- ---------------------------------------------------------------------
-- 4. contracts — admin puede leer y actualizar el status de cualquier
--    contrato (ej. terminar, marcar como activo)
-- ---------------------------------------------------------------------
drop policy if exists "admin_select_all_contracts" on public.contracts;
create policy "admin_select_all_contracts"
  on public.contracts for select
  using ( public.is_admin() );

drop policy if exists "admin_update_all_contracts" on public.contracts;
create policy "admin_update_all_contracts"
  on public.contracts for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ---------------------------------------------------------------------
-- 5. verifications — admin puede leer y aprobar/rechazar cualquier
--    solicitud de verificación
-- ---------------------------------------------------------------------
drop policy if exists "admin_select_all_verifications" on public.verifications;
create policy "admin_select_all_verifications"
  on public.verifications for select
  using ( public.is_admin() );

drop policy if exists "admin_update_all_verifications" on public.verifications;
create policy "admin_update_all_verifications"
  on public.verifications for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- ---------------------------------------------------------------------
-- 6. user_reports — admin puede leer y resolver cualquier reporte
-- ---------------------------------------------------------------------
drop policy if exists "admin_select_all_reports" on public.user_reports;
create policy "admin_select_all_reports"
  on public.user_reports for select
  using ( public.is_admin() );

drop policy if exists "admin_update_all_reports" on public.user_reports;
create policy "admin_update_all_reports"
  on public.user_reports for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =====================================================================
-- NOTA IMPORTANTE — Operaciones que RLS no puede cubrir:
-- Si en el futuro el panel admin necesita una acción que RLS no puede
-- expresar (ej. borrar la cuenta `auth.users` de otro usuario, no solo
-- su fila en `profiles`), la solución correcta NO es volver a poner la
-- Service Role Key en el cliente. Es crear una Supabase Edge Function
-- que:
--   1. Reciba el JWT del admin en el header Authorization.
--   2. Verifique server-side que el llamante es admin (misma lógica de
--      is_admin() de arriba, ejecutada en el server).
--   3. Use la Service Role Key SOLO como variable de entorno de la
--      función (`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`),
--      nunca en código que se compile al bundle del cliente.
--   4. Se invoque desde la app con `supabase.functions.invoke(...)`.
-- =====================================================================
