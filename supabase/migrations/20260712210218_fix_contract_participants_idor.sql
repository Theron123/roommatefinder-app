-- RM-2026-005 (Crítico): contract_participants tenía INSERT sin ninguna
-- restricción (with_check: true) y SELECT abierto a todo authenticated
-- (qual: true) — cualquier usuario podía auto-agregarse como parte de
-- CUALQUIER contrato ajeno y, vía la policy "Users can view/update their
-- own contracts" (que confía en contract_participants), terminar con
-- acceso de lectura/escritura a ese contrato.
--
-- Flujo real de la app (app/contracts/new.tsx): el INICIADOR del contrato
-- (auth.uid() = contracts.initiator_id) es quien inserta las filas de
-- participantes (con user_id de las OTRAS personas invitadas), justo
-- después de crear el contrato. El fix exige exactamente eso.

drop policy if exists "Authenticated users can insert contract participants" on public.contract_participants;
create policy "initiator can add participants to own contract"
  on public.contract_participants for insert to authenticated
  with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.initiator_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can read contract participants" on public.contract_participants;
create policy "users can read participants of their own contracts"
  on public.contract_participants for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.initiator_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );
