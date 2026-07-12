-- Fix de un bug introducido por la migración anterior
-- (20260712210218_fix_contract_participants_idor.sql): las nuevas policies
-- de contract_participants consultaban directamente "contracts", y la
-- policy "Users can view their own contracts" de contracts consulta
-- contract_participants — ciclo que Postgres detecta como recursión
-- infinita ("infinite recursion detected in policy for relation
-- contracts"), tumbando cualquier insert/select sobre ambas tablas.
--
-- Fix: una función SECURITY DEFINER que consulta contracts sin pasar por
-- su RLS (mismo patrón que is_admin()), rompiendo el ciclo.

create or replace function public.is_contract_initiator(p_contract_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.contracts c
    where c.id = p_contract_id and c.initiator_id = p_user_id
  );
$$;

drop policy if exists "initiator can add participants to own contract" on public.contract_participants;
create policy "initiator can add participants to own contract"
  on public.contract_participants for insert to authenticated
  with check (public.is_contract_initiator(contract_id, auth.uid()));

drop policy if exists "users can read participants of their own contracts" on public.contract_participants;
create policy "users can read participants of their own contracts"
  on public.contract_participants for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_contract_initiator(contract_id, auth.uid())
    or public.is_admin(auth.uid())
  );
