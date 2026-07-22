-- RM-2026-003 (Crítico): el bucket "contracts" era público (lectura sin
-- autenticación) con nombres de archivo predecibles ({contract_id}.pdf),
-- exponiendo direcciones, montos y nombres de las partes de cualquier
-- contrato a quien tuviera o adivinara la URL. Además, la policy de
-- escritura ("Authenticated users can upload contracts") permitía a
-- cualquier usuario autenticado subir/sobrescribir el archivo de
-- CUALQUIER contrato, no solo el propio.
--
-- Fix: bucket privado + policies de SELECT/INSERT/UPDATE acotadas a
-- quienes de verdad son parte del contrato (initiator o
-- contract_participants) o son admin. El acceso desde la app pasa a
-- requerir una URL firmada (createSignedUrl), que Supabase solo emite si
-- la policy de SELECT se cumple para quien la pide.

-- El bucket "contracts" también se creó manualmente desde el Dashboard en
-- producción, nunca por migración (mismo problema que "Roommate" en
-- 20260712204303). Se crea de forma idempotente para reproducibilidad local.
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

update storage.buckets set public = false where id = 'contracts';

drop policy if exists "Public can read contracts" on storage.objects;
drop policy if exists "Authenticated users can upload contracts" on storage.objects;

create policy "contract parties can read their contract files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contracts'
    and exists (
      select 1 from public.contracts c
      where c.id::text = split_part(storage.objects.name, '.', 1)
        and (
          c.initiator_id = auth.uid()
          or public.is_admin(auth.uid())
          or exists (
            select 1 from public.contract_participants cp
            where cp.contract_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );

create policy "contract parties can upload their contract files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contracts'
    and exists (
      select 1 from public.contracts c
      where c.id::text = split_part(storage.objects.name, '.', 1)
        and (
          c.initiator_id = auth.uid()
          or exists (
            select 1 from public.contract_participants cp
            where cp.contract_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );

create policy "contract parties can update their contract files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'contracts'
    and exists (
      select 1 from public.contracts c
      where c.id::text = split_part(storage.objects.name, '.', 1)
        and (
          c.initiator_id = auth.uid()
          or exists (
            select 1 from public.contract_participants cp
            where cp.contract_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );
