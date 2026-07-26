-- Test de regresión de seguridad para los triggers de public.profiles que
-- protegen `role`/`trust_score`/flags de verificación contra escalación de
-- privilegios (protect_privileged_profile_columns, tr_check_new_profile_role,
-- tr_check_role_update — ver supabase/migrations/20260712203127,
-- 20260712202000, 20260712204651 y 20260712213404).
--
-- Existe porque ya hubo una regresión real: la primera versión del trigger de
-- protección revertía `role` en CUALQUIER update de un no-admin, rompiendo en
-- silencio el cambio legítimo seeker->host de app/role-select.tsx. Este test
-- cubre los 5 escenarios verificados manualmente en esa auditoría, más un
-- caso extra que confirma que el bootstrap de la cuenta admin sigue
-- funcionando (para que ambos triggers, escritos por dos personas distintas,
-- se sigan verificando juntos en cada cambio futuro).
--
-- Correr con: supabase test db supabase/tests/database
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Fixtures: profiles.id tiene FK a auth.users(id), así que necesitamos filas
-- reales ahí primero.
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'user1@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'user2@example.com'),
  ('10000000-0000-0000-0000-0000000000b0', 'admin@roommatefinder.com');

-- Perfil inicial de un usuario normal, como quedaría tras un signup real.
insert into public.profiles (id, name, role) values
  ('10000000-0000-0000-0000-000000000001', 'Usuario Uno', 'seeker');

-- ── Escenario 1: cambio legítimo de rol (seeker -> host) por el propio usuario ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
update public.profiles set role = 'host' where id = '10000000-0000-0000-0000-000000000001';
reset role;

select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'host',
  'Escenario 1: un usuario puede cambiar su propio rol de seeker a host'
);

-- ── Escenario 2: intento de escalar a admin ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000001'$$,
  'No tienes permisos para asignar o modificar este rol.',
  'Escenario 2: un no-admin no puede auto-asignarse role=admin'
);
reset role;

select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'host',
  'Escenario 2b: el rol sigue siendo host tras el intento fallido de escalar a admin'
);

-- ── Escenario 3: intento de escalar a company ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$update public.profiles set role = 'company' where id = '10000000-0000-0000-0000-000000000001'$$,
  'No tienes permisos para asignar o modificar este rol.',
  'Escenario 3: un no-admin no puede auto-asignarse role=company'
);
reset role;

select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'host',
  'Escenario 3b: el rol sigue siendo host tras el intento fallido de escalar a company'
);

-- ── Escenario 4: auto-escalación de trust_score ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
update public.profiles set trust_score = 999 where id = '10000000-0000-0000-0000-000000000001';
reset role;

select is(
  (select trust_score from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  20,
  'Escenario 4: un no-admin no puede auto-asignarse trust_score=999 (se revierte al original)'
);

-- ── Escenario 5: bypass directo vía INSERT con role=admin ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.profiles (id, name, role) values
  ('10000000-0000-0000-0000-000000000002', 'Atacante', 'admin');
reset role;

select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-000000000002'),
  'seeker',
  'Escenario 5: un INSERT directo con role=admin se degrada a seeker si no es la cuenta bootstrap'
);

-- ── Escenario 6 (bonus): la cuenta bootstrap sí recibe role=admin al insertar su perfil ──
select set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-0000000000b0', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.profiles (id, name, role) values
  ('10000000-0000-0000-0000-0000000000b0', 'Super Admin', 'seeker');
reset role;

select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-0000000000b0'),
  'admin',
  'Escenario 6: la cuenta bootstrap (admin@roommatefinder.com) siempre recibe role=admin al crear su perfil'
);

select * from finish();
rollback;
