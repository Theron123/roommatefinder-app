-- Reconciliación con el trabajo en paralelo de otro colaborador
-- (migraciones 20260712201000_role_hierarchy_permissions.sql y
-- 20260712202000_assign_super_admin.sql, commit "nivel 2 prueba 1").
--
-- Esa migración agrega su propio mecanismo de bootstrap: cualquier cuenta
-- cuyo auth.users.email sea 'admin@roommatefinder.com' recibe role='admin'
-- automáticamente al insertar su perfil (tr_check_new_profile_role), y un
-- trigger tr_check_role_update que bloquea que un no-admin cambie `role`
-- a/desde 'admin'/'company'.
--
-- Mi propio trigger (trg_protect_privileged_profile_columns, migración
-- 20260712203127) fuerza `role` a 'seeker' en cualquier INSERT que traiga
-- 'admin', sin excepción — lo cual revertiría el bootstrap legítimo de
-- arriba, ya que ambos triggers corren sobre el mismo INSERT (el de ellos
-- primero por orden alfabético, el mío después).
--
-- Este fix agrega la misma excepción que ya usa su bootstrap, para que
-- ambos triggers convivan: solo se permite role='admin' en el INSERT si el
-- email de auth.users coincide con la cuenta de bootstrap designada.

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
      new.role := old.role;
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
    elsif new.role = 'admin' and not is_bootstrap_admin then
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
