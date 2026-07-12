-- RM-2026-001 (Crítico): cualquier usuario autenticado podía hacer
-- update profiles set role='admin' sobre su propia fila, porque la policy
-- de UPDATE solo valida auth.uid() = id (a nivel de fila) y no hay ninguna
-- restricción de columna. Verificado explotable en vivo durante la
-- auditoría de seguridad del 12 de julio, 2026.
--
-- Por qué un TRIGGER y no un REVOKE de columna: el panel admin
-- (app/(admin)/users.tsx, verifications.tsx) actualiza estas MISMAS
-- columnas (role, trust_score, risk_level, is_*_verified) usando el
-- cliente normal autenticado, apoyado en la policy "Admins can update all
-- profiles" — admin y usuario normal son el mismo rol de Postgres
-- (authenticated), solo se diferencian por RLS a nivel de fila. Un REVOKE
-- de columna a nivel de rol habría bloqueado también al admin legítimo.
-- Un trigger BEFORE UPDATE sí puede distinguir el caso usando
-- is_admin(auth.uid()) evaluado en el momento de la escritura.
--
-- Fix: si quien escribe NO es admin, los campos protegidos se revierten
-- silenciosamente a su valor anterior (protección tipo "mass assignment"),
-- sin romper actualizaciones normales de perfil que reenvían el objeto
-- completo con esos campos sin cambios.

-- También cubre INSERT: role-select.tsx y preferences.tsx insertan la fila
-- inicial de perfil directo desde el cliente (sin pasar por un admin), así
-- que un INSERT manual con role='admin' era igual de explotable que el UPDATE.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    -- Nadie puede autonombrarse admin ni auto-verificarse al crear su perfil.
    if new.role is null or new.role = 'admin' then
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

drop trigger if exists trg_protect_privileged_profile_columns on public.profiles;
create trigger trg_protect_privileged_profile_columns
  before insert or update on public.profiles
  for each row
  execute function public.protect_privileged_profile_columns();

-- Defensa en profundidad adicional a nivel de policy (no depender solo del trigger).
drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
