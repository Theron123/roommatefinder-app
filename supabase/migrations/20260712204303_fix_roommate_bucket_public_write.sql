-- RM-2026-002 (Crítico): el bucket "Roommate" (fotos de perfil y de
-- anuncios) tenía policies de INSERT/UPDATE/DELETE para el rol `public`
-- sin ninguna condición de autenticación ni de ownership — cualquiera en
-- internet, sin sesión, podía subir, sobrescribir o borrar la foto de
-- cualquier usuario. Verificado durante la auditoría del 12 de julio, 2026.
--
-- Los archivos no usan carpetas (no hay "/" en el nombre), sino un patrón
-- plano definido en el propio código cliente:
--   perfil:   `${user.id}-${timestamp}-${slot}.ext`        (preferences.tsx, myprofile.tsx)
--   anuncios: `listing-${user.id}-${timestamp}-${idx}.ext` (manage-listing.tsx)
-- Por eso el check de ownership compara el nombre contra esos dos patrones
-- en vez del típico storage.foldername(name)[1] = auth.uid().

-- El bucket "Roommate" se creó manualmente desde el Dashboard en producción,
-- nunca por migración — por eso un bootstrap local desde cero (supabase
-- start/db reset) fallaba aquí. Se crea de forma idempotente para que el
-- historial de migraciones sea reproducible en cualquier entorno nuevo.
--
-- En un arranque 100% limpio (sin volumen cacheado), el contenedor de
-- storage corre sus propias migraciones internas (las que crean
-- storage.buckets/storage.objects) de forma asíncrona respecto a las
-- migraciones de este proyecto — es una carrera real, no determinística:
-- a veces storage.buckets ya existe cuando llegamos acá, a veces no
-- (confirmado: mismo comando falló 2/2 veces y luego pasó 3/3 veces en la
-- misma máquina). Sin este guard, perder la carrera tumba la migración
-- completa y bloquea TODO lo que viene después en la cadena.
do $$
declare
  waited int := 0;
begin
  while to_regclass('storage.buckets') is null and waited < 30 loop
    perform pg_sleep(1);
    waited := waited + 1;
  end loop;

  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets no apareció tras esperar 30s — se omite el bootstrap del bucket Roommate. Volvé a correr "supabase db reset" una vez que el contenedor de storage haya terminado de inicializar.';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('Roommate', 'Roommate', true)
  on conflict (id) do nothing;

  update storage.buckets
  set file_size_limit = 5242880, -- 5MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic']
  where id = 'Roommate';

  drop policy if exists "Permitir todo 1x8ulxc_1" on storage.objects; -- INSERT
  drop policy if exists "Permitir todo 1x8ulxc_2" on storage.objects; -- DELETE
  drop policy if exists "Permitir todo 1x8ulxc_3" on storage.objects; -- UPDATE

  create policy "users can upload their own Roommate files"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'Roommate'
      and (
        left(name, 36) = auth.uid()::text
        or name like ('listing-' || auth.uid()::text || '-%')
      )
    );

  create policy "users can update their own Roommate files"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'Roommate'
      and (
        left(name, 36) = auth.uid()::text
        or name like ('listing-' || auth.uid()::text || '-%')
      )
    );

  create policy "users can delete their own Roommate files"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'Roommate'
      and (
        left(name, 36) = auth.uid()::text
        or name like ('listing-' || auth.uid()::text || '-%')
      )
    );
end $$;

-- La lectura pública se deja tal cual ("Permitir todo 1x8ulxc_0") — es
-- intencional, igual que profiles: fotos de perfil/anuncios se muestran a
-- cualquiera navegando el feed, incluso antes de iniciar sesión.
