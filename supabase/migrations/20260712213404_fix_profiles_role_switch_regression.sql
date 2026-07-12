-- Bug encontrado en la segunda auditoría (12 de julio, 2026): la migración
-- 20260712203127_fix_profiles_privilege_escalation.sql revertía `role` a
-- su valor anterior en CUALQUIER UPDATE hecho por un no-admin — no solo
-- los intentos de escalar a 'admin'. Esto rompía en silencio (sin error)
-- el flujo legítimo de app/role-select.tsx, donde un usuario existente
-- cambia de rol (ej. seeker -> host) actualizando su propia fila.
--
-- El trigger de Sebastian (tr_check_role_update, migración
-- 20260712202000_assign_super_admin.sql) ya protege `role` correctamente
-- por sí solo: bloquea con excepción cualquier intento de un no-admin de
-- poner role a 'admin'/'company', o de cambiar un role que ya era
-- 'admin'/'company' — y deja pasar libremente los cambios entre
-- 'seeker'/'host'/'landlord'. Mi trigger duplicaba esa protección de forma
-- más agresiva (sin la excepción para valores seguros) y rompía el caso
-- legítimo.
--
-- Fix: mi trigger deja de tocar `role` en UPDATE — confío en el suyo para
-- eso — y sigue protegiendo trust_score/risk_level/is_*_verified, que el
-- suyo no cubre.

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_bootstrap_admin boolean;
begin
  if tg_op = 'UPDATE' then
    if not public.is_admin(auth.uid()) then
      -- `role` ya lo protege tr_check_role_update (permite seeker/host/landlord
      -- entre sí, bloquea admin/company) — no lo tocamos aquí.
      new.trust_score := old.trust_score;
      new.risk_level := old.risk_level;
      new.is_identity_verified := old.is_identity_verified;
      new.is_background_verified := old.is_background_verified;
      new.is_social_verified := old.is_social_verified;
      new.is_email_verified := old.is_email_verified;
      new.is_income_verified := old.is_income_verified;
      new.is_references_verified := old.is_references_verified;
      new.is_university_verified := old.is_university_verified;
      new.is_workplace_verified := old.is_workplace_verified;
      new.id := old.id;
      new.created_at := old.created_at;
    end if;
  elsif tg_op = 'INSERT' then
    select exists (
      select 1 from auth.users where id = new.id and email = 'admin@roommatefinder.com'
    ) into is_bootstrap_admin;

    if new.role is null then
      new.role := 'seeker';
    elsif new.role in ('admin', 'company') and not is_bootstrap_admin then
      new.role := 'seeker';
    end if;
    new.trust_score := 20;
    new.risk_level := 'low';
    new.is_identity_verified := false;
    new.is_background_verified := false;
    new.is_social_verified := false;
    new.is_email_verified := false;
    new.is_income_verified := false;
    new.is_references_verified := false;
    new.is_university_verified := false;
    new.is_workplace_verified := false;
  end if;
  return new;
end;
$$;
