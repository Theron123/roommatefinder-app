# Antigravity Rules & Project Architecture - Roommate Finder

Este documento es la **fuente de la verdad** técnica y arquitectónica del proyecto `roommatefinder-app`. 
**Nota para la IA (Antigravity):** Lee SIEMPRE este documento al inicio de una sesión para comprender el contexto global del proyecto, la estructura de carpetas, las decisiones previas y las reglas estrictas de código.

---

## 🏗 1. Stack Tecnológico Principal
- **Framework:** Expo (SDK 54) / React Native 0.81 (Cross-platform: iOS, Android, Web).
- **Enrutamiento:** Expo Router v6 (File-based routing en la carpeta `app/`).
- **BaaS (Backend):** Supabase (`@supabase/supabase-js` v2.108).
- **Estilos y UI:** StyleSheet nativo, `@expo/vector-icons`, gradientes (`expo-linear-gradient`), y carga de imágenes nativa (`expo-image-picker`).
- **Data fetching:** `@tanstack/react-query` (staleTime 5min / gcTime 30min) — adoptado parcialmente en `hooks/useProfileQueries.ts` y `hooks/useInboxQueries.ts`; `useExplore.ts` y `useMatches.ts` aún usan `useState`/`useEffect` manual (migración pendiente, no completa).
- **Mapas:** `react-native-maps` (nativo, `PROVIDER_GOOGLE`) vía `components/MapViewWrapper.native.tsx`; en Web se usa `leaflet` + `react-leaflet` sobre tiles OpenStreetMap vía `components/MapViewWrapper.tsx` (respeta la regla anti-CORS).
- **Notificaciones push:** `expo-notifications` + `expo-device` (`lib/notifications.ts`), con fallback a la `Notification` API del navegador en Web.
- **Generación de PDF (Contratos):** `expo-print` en nativo (`Print.printToFileAsync`); `html2pdf.js` (import dinámico) en Web. El PDF se sube al bucket de Storage `contracts`.
- **Validación de identificación nacional:** paquete `idnumbers`, usado en `app/(auth)/signup.tsx` (caso especial para Costa Rica con regex de 9 dígitos; fallback alfanumérico genérico para otros países).
- **Dependencia no utilizada:** `react-native-google-places-autocomplete` está en `package.json` pero no se importa en ningún archivo — es código muerto, no una violación activa de la regla anti-CORS. Candidata a eliminar en la próxima limpieza de dependencias.
- **Paleta de Colores (Brand):**
  - Primary Accent: `#49C788` (Verde vibrante, extraído del logo).
  - Secondary/Dark: `#246D4B` (Verde bosque, para gradientes).
  - Background: `#000` / `#0a0a0a` (Dark mode global).
  - Surface: `#111` / `#1a1a24` (Tarjetas, modales).
  - Text: `#fff` (Primary), `#aaa` / `#888` (Secondary).
  - **IMPORTANTE:** No usar `#6C63FF` (morado antiguo). Todo acento debe ser `#49C788`.

---

## 🔑 1B. Variables de Entorno y Secretos
No había ninguna referencia central de esto antes del 12 de julio, 2026 — quedaba implícito en el código. Documentado aquí para que no haya que volver a descubrirlo cada vez.

- **`.env`** (raíz del repo, **sí está trackeado en git** — está bien porque solo contiene valores `EXPO_PUBLIC_*`, que Expo empaqueta en el bundle del cliente de todas formas, o sea nunca fueron secretos reales):
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — cliente de Supabase (`lib/supabase.ts`). La anon key es pública por diseño; la seguridad real la da RLS (ver sección 3.5).
  - `EXPO_PUBLIC_YARDI_SIMULATION_MODE` — flag para `lib/integrations/yardi/`.
- **`.env.local`** (gitignored, **nunca commitear**, usado solo para tooling de desarrollo local, no lo lee la app en runtime):
  - `SUPABASE_ACCESS_TOKEN` — token de cuenta para el CLI de Supabase (`supabase link`/`db pull`/`db push`/`functions deploy`/etc.). Da acceso a nivel de cuenta completa, no solo a este proyecto — tratarlo con el mismo cuidado que una contraseña.
- **Secretos de Supabase Edge Functions** (no viven en ningún archivo del repo — se configuran una vez con `supabase secrets set NOMBRE=valor --project-ref jwzcvozwygsfkouclhrz` y quedan guardados del lado de Supabase):
  - `RESEND_API_KEY` — usado por `supabase/functions/send-email-otp` para enviar el código OTP. Configurado el 12 de julio, 2026 con una key de **solo envío** (sending-only) — si en el futuro hace falta gestionar dominios vía API de Resend, esa key no alcanza, hay que crear una de acceso completo.
  - `RESEND_FROM_EMAIL` — opcional, dirección remitente. Sin configurar, el código usa el sandbox `onboarding@resend.dev` de Resend, que **solo entrega a la propia cuenta de Resend del dueño del proyecto** (ver limitación en el changelog del 12 de julio). Pendiente: verificar el dominio `mail.roomiemates.com` en resend.com/domains y luego setear esta variable a algo como `RoomieMates <noreply@mail.roomiemates.com>`.
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — estas las inyecta Supabase automáticamente en todo Edge Function, no hace falta configurarlas a mano. Son las únicas veces que el Service Role Key debe usarse, y solo del lado de servidor (Deno), nunca en el bundle del cliente — ver Regla Crítica #5.

---

## 📂 2. Estructura del Proyecto (Expo Router)
La aplicación se organiza basándose en el enrutamiento de archivos de Expo Router:

- **`app/(auth)/`**: Pantallas públicas de autenticación (`login.tsx`).
- **`app/(tabs)/`**: Navegación principal (Bottom Tabs).
  - `index.tsx`: (Home) Vista principal tipo Swipe/Tinder.
  - `explore.tsx`: Exploración en mapa/lista.
  - `inbox.tsx`: Bandeja de entrada y búsqueda de chats activos.
  - `myprofile.tsx`: Dashboard del usuario logueado.
- **`app/chat/[id].tsx`**: Sala de chat en tiempo real 1 a 1 con integración multimedia.
- **`app/profile/[id].tsx`**: Vista detallada del perfil público de otro roommate.
- **`app/onboarding.tsx`**: Flujo tipo tutorial de bienvenida interactivo.
- **`app/preferences.tsx`**: Modal o pantalla completa para editar preferencias y ubicación.
- **`app/role-select.tsx`**: Onboarding de 2 pasos (animado) para elegir rol (landlord/host/seeker) post-registro.
- **`app/(admin)/`**: Panel de administración completo — `_layout.tsx` (sidebar + guardia de acceso), `index.tsx` (overview), `users.tsx`, `listings.tsx`, `contracts.tsx`, `payments.tsx`, `reports.tsx`, `verifications.tsx`, `settings.tsx`.
- **`app/contracts/`**: Sistema de contratos — `index.tsx` (listado), `new.tsx` (creación, incl. asistente de cláusulas), `review.tsx`, `[id].tsx` (detalle/firma).
- **`app/trust/`**: Trust Center — `index.tsx`, `verify.tsx` (verificación de identidad/teléfono/redes), `report.tsx` (reporte de usuarios), `tips.tsx`.
- **`app/settings/`**: `index.tsx`, `about.tsx`, `blocked.tsx`, `help.tsx`, `notifications.tsx`, `privacy.tsx`.
- **`app/listing/[id].tsx`** y **`app/manage-listing.tsx`**: vista y gestión de anuncios de apartamentos (rol `landlord`).
- **`app/api/zumper-feed+api.ts`**: endpoint API route de Expo Router que publica un feed XML de listings hacia Zumper (actualmente con datos mock).
- **`app/activity.tsx`**, **`app/followers.tsx`**, **`app/terms.tsx`**: actividad reciente, seguidores y términos legales.
- **`components/chat/`**: además del chat base, incluye `modals/` con `ChatActionMenu`, `ChatAttachMenu`, `ChatForwardModal`, `ChatSettingsModal`, `ImageViewerModal`, `MessageInfoModal`.
- **`components/explore/`**: `ExploreCard`, `ExploreHeader`, `ExploreMapView` (mapa real), `ExploreSwipeControls`; complementado por `app/explore/filters.tsx`.
- **`components/trust/`**: `TrustAlertModal`, `TrustBadgeDetailModal`, `TrustInstagramModal`.
- **`components/contracts/`**: `ContractStepMatches.tsx` (selector de firmantes/roomies para contratos grupales).
- **`components/profile/`**: `ProfileHeader`, `ProfileLifestyleDetails`, `EditProfileModal`.
- **`context/LanguageContext.tsx`**: motor de traducción EN/ES basado en un diccionario estático (`constants/translations.ts`, ~1200 líneas), persistido en `AsyncStorage` — no es un motor dinámico/IA pese a como lo describe el commit original.
- **`context/AdminThemeContext.tsx`**: theming separado para el panel de administración.
- **`lib/integrations/`**: capa de integración con Property Management Systems — `pms-interface.ts` (interfaz genérica), `yardi/` (cliente completo para Yardi Voyager: client, config, errors, mappers, provider, sync, types — corre en `simulationMode: true`, sin credenciales reales), `zumper/ZumperFeedGenerator.ts`.
- **`lib/supabaseAdmin.ts`**: cliente Supabase con Service Role Key — ver advertencia de seguridad crítica en la sección 3.
- **`components/ui/`**: Componentes reutilizables (ej. `LocationAutocomplete.tsx`, `TutorialModal.tsx`, `icon-symbol.tsx`).

---

## 🚨 3. Reglas Críticas de Desarrollo (Antigravity Rules)

1. **Compatibilidad Web Obligatoria (Cross-Platform):** 
   - La aplicación DEBE compilar y funcionar sin errores en la Web (Browser).
   - *Regla de Oro API:* Jamás introducir librerías que dependan exclusivamente de APIs nativas sin *fallbacks* para web, o que fallen por bloqueos de **CORS** (Por ejemplo, usamos **OpenStreetMap/Nominatim** en lugar de Google Places Autocomplete).
2. **Navegación Robusta (Expo Router):** 
   - Evita el uso indiscriminado de `router.back()` en flujos críticos (ej. salir de modal de preferencias), ya que puede dejar al usuario en pantallas incorrectas si recargó en web. Utiliza enrutamiento absoluto seguro como `router.replace('/(tabs)/myprofile')`.
   - Preferir interfaces guiadas por estados lógicos en lugar de `FlatList` horizontales para tutoriales o paginaciones donde la Web podría no interpretar el *scroll* correctamente.
3. **Experiencia de Usuario (Optimistic UI):** 
   - En componentes interactivos (como el Chat), asume que la acción del usuario es exitosa. Dibuja el mensaje o la imagen al instante en la pantalla, asigna un estado visual (⏳, ✅, ❗️), y actualízalo cuando el backend (`Supabase`) responda.
4. **Cero Mocks (Supabase Only):** 
   - El proyecto ya no utiliza datos falsos o `MOCK_PROFILES`. Cualquier *feature* nuevo debe leer y escribir sus datos conectándose mediante `@supabase/supabase-js`.
   - **⚠️ Excepciones activas sin resolver (deuda técnica, no seguir como ejemplo):** el asistente de "IA" que sugiere cláusulas en `app/contracts/new.tsx` es un `setTimeout` que devuelve 3 cláusulas fijas; el login de redes sociales en `TrustInstagramModal` sigue simulado (pendiente de OAuth real de Meta, decisión deliberada de posponerlo — ver changelog del 12 de julio); la sincronización con Yardi corre en `simulationMode: true`; el feed de Zumper usa datos mock en vez de la tabla `listings` (y además `app/api/*+api.ts` no corre en producción bajo `web.output:"single"` — ver nota en Arquitectura). Cualquier IA que continúe este proyecto debe conectar estos módulos a datos/servicios reales antes de darlos por terminados, no asumir que ya están completos porque existen visualmente.
   - **✅ Resuelto el 12 de julio, 2026:** la verificación de teléfono (SMS de prueba `123456`) fue reemplazada por OTP real por email — ver `supabase/functions/send-email-otp` y `verify-email-otp`, y la revisión manual de identidad/antecedentes ya funcionaba de verdad desde antes (`app/trust/verify.tsx` siempre insertó en `verifications` con `status:'pending'` salvo que el toggle local `autoVerify` de AsyncStorage estuviera activo — no era mock, solo dependía de revisión humana en el panel admin).

5. **🟢 Regla de Seguridad Crítica (Service Role Key) — CORREGIDO el 7 de julio, 2026:**
   - `lib/supabaseAdmin.ts` contenía la **Service Role Key de Supabase embebida y ofuscada** (concatenada en 4 fragmentos, con comentario explícito de que era "para bypasear GitHub Push Protection"). Se importaba en 4 pantallas de `app/(admin)/` (`listings.tsx`, `users.tsx`, `contracts.tsx`, `verifications.tsx`) **pero nunca se llegó a invocar** (`supabaseAdmin.from(...)` no aparecía en ningún archivo) — era código muerto/scaffolding.
   - **Fix aplicado:** se eliminó `lib/supabaseAdmin.ts` y los 4 imports muertos. Cero regresión funcional porque el cliente nunca se usaba. Verificado con `grep -rn "supabaseAdmin"` sobre todo el repo (código fuente limpio; solo queda mencionado aquí, en el changelog).
   - Las operaciones reales de escritura del panel admin (suspender usuario, aprobar verificación, borrar listing, cambiar status de contrato) siempre pasaron por el cliente normal (`lib/supabase.ts`), es decir dependen de RLS.
   - **✅ Verificado el 10 de julio, 2026 (consulta directa a `pg_policies`/`pg_proc` vía Management API):** las políticas de admin **ya estaban activas en la base real**, creadas desde el editor visual del Dashboard con nombres tipo `"Admins can update all listings"`, apoyadas en una función `is_admin(user_id uuid)` (con argumento, `SECURITY DEFINER`, verifica `profiles.role = 'admin'`) — **distinta** de la `is_admin()` sin argumento que propone `supabase/admin_rls_policies.sql`. Cobertura confirmada en `profiles`, `listings`, `contracts`, `verifications`, `user_reports`, y además `matches` y `swipes` (que el script del repo ni contempla).
   - **`supabase/admin_rls_policies.sql` es redundante y nunca se ejecutó** — no hace falta correrlo; si se corre, solo crea una segunda función `is_admin()` sin uso y políticas duplicadas. Se deja el archivo como referencia histórica de cómo se pensó resolver esto antes de descubrir que ya estaba resuelto por otra vía. La fuente de verdad real del RLS de admin son las políticas activas descritas arriba, no este archivo.
   - **⚠️ Pendiente y solo accionable por el humano:** la key expuesta debe **rotarse** en Supabase (Project Settings → API Keys → sección "Legacy API Keys" → rotar `service_role`), ya que quedó en el historial de git (posiblemente en GitHub) independientemente de que el archivo ya no exista en el working tree actual. Rotar la key invalida cualquier copia filtrada. **Al 10 de julio, 2026 este paso seguía pendiente de confirmación** — cualquier IA que continúe este proyecto debe volver a preguntar el estado antes de asumir que ya se hizo.
   - **Patrón correcto para el futuro:** si el panel admin llega a necesitar una operación que RLS no puede expresar (ej. borrar la cuenta `auth.users` de otro usuario, no solo su fila en `profiles`), la solución es una **Supabase Edge Function** que reciba el JWT del admin, verifique el rol server-side, y use la Service Role Key solo como secreto de servidor (`supabase secrets set`) — nunca en código que compile al bundle del cliente, y nunca pegada en el chat de un agente de IA (aunque el agente no la guarde en el código, queda registrada en el historial de la conversación).
   - La protección de rutas del panel admin (`app/(admin)/_layout.tsx`) sigue siendo solo client-side (verifica `profiles.role === 'admin'` en el front); la seguridad real depende de las políticas RLS activas descritas arriba, que ya están confirmadas funcionando (ver verificación con `anon key` en `scratch/verify_rls_anon.mjs`: usuarios anónimos no pueden leer ni escribir en `listings`/`contracts`/`verifications`/`user_reports`, y no pueden escribir en `profiles`).

---

## 🗄 4. Arquitectura de Base de Datos y Storage

### A0. Migraciones (a partir del 10 de julio, 2026)
- **Antes:** no existía `supabase/migrations/` en el repo. El remoto sí tenía historial de 6 migraciones (mayo 2026) que nunca se subieron a git — la carpeta se perdió o nunca se commiteó. Todo cambio de schema se hacía a mano en el SQL Editor del dashboard, sin quedar versionado.
- **Ahora:** se reparó el tracking (`supabase migration repair --status reverted ...` sobre las 6 entradas huérfanas) y se generó un baseline real con `supabase db pull` (requiere Docker/Colima — el CLI corre `pg_dump` dentro de un contenedor): [`supabase/migrations/20260711035956_remote_schema.sql`](supabase/migrations/20260711035956_remote_schema.sql), 10 tablas y 39 políticas, sin datos (solo DDL).
- **Regla desde ahora:** cualquier cambio de schema nuevo debe ir en una migración (`supabase migration new <nombre>` + `supabase db push`, o `supabase db pull` después de aplicarlo en el dashboard), nunca más SQL suelto sin versionar. Confirmado que las tablas de PMS (`pms_company_configs`, `pms_entity_mappings`, `pms_sync_logs`) de `lib/integrations/database-migration.sql` **no están aplicadas** en la base real — ese script sigue siendo solo una propuesta.

### A. Tablas Principales (Supabase PostgreSQL)
- **`profiles`:** 
  - Centraliza a todos los usuarios.
  - Campos clave: `id`, `name`, `age`, `photoUrl`, `lat`, `lng`, `location_name`, `bio`, `role` (incluye ahora `admin`).
- **`messages`:** 
  - Almacena el historial de chat 1 a 1.
  - Campos clave: `id`, `sender_id`, `receiver_id`, `content`, `media_url`, `media_type`, `created_at`.
  - **Replicación:** `Realtime` habilitado para permitir WebSockets.
- **`listings`:** Anuncios de apartamentos publicados por `landlord`/`host`.
- **`matches`** y **`swipes`:** Historial de likes/matches del feed tipo Tinder.
- **`contracts`** y **`contract_participants`:** Contratos de renta, incl. contratos multilaterales/grupales con múltiples firmantes.
- **`verifications`:** Estado de verificación de identidad/teléfono/redes del Trust Center.
- **`user_reports`:** Reportes de usuarios (compartido entre `app/trust/report.tsx` y la pestaña "conflicts" del panel admin).
- **`user_blocks`:** Usuarios bloqueados (`app/settings/blocked.tsx`).
- **`pms_company_configs`, `pms_entity_mappings`, `pms_sync_logs`:** Tablas multitenant para la integración con Property Management Systems (Yardi).
- **RPC `delete_user`:** Borrado de cuenta invocado desde `app/settings/index.tsx`.

### B. Storage (Multimedia)
- **`chat_media` (Bucket Público):** Usado para almacenar las fotos e imágenes enviadas en el chat. Genera URLs públicas (`getPublicUrl`) que se guardan en la tabla `messages`.
- **`Roommate` (Bucket):** Fotos de perfil y de listings (soporta múltiples fotos por perfil/apartamento).
- **`contracts` (Bucket):** PDFs de contratos generados/firmados.

### C. Seguridad (Row Level Security - RLS)
- RLS está **ESTRICTAMENTE ACTIVADO** en todas las tablas sensibles.
- Los usuarios solo pueden insertar registros si el `sender_id` coincide con su `auth.uid()`.
- **Actualizado (7 jul 2026):** `lib/supabaseAdmin.ts` (que tenía la Service Role Key embebida en el bundle cliente) fue eliminado — ver Regla Crítica #5 en la sección 3. Las escrituras del panel admin ahora dependen de las políticas RLS de `supabase/admin_rls_policies.sql`, que deben ejecutarse manualmente en el dashboard de Supabase. Los scripts SQL para configuraciones que requieran privilegios elevados se siguen entregando al usuario para ejecutar manualmente — nunca se agregan al código del cliente.

---

## 🎭 5. Sistema de Roles (Jerarquía)

La aplicación maneja tres roles principales para diferenciar la intención de los usuarios:

1. **`landlord` (Propietario):** Persona que tiene un apartamento para rentar, pero **NO** vive allí. Solo quiere publicar propiedades. *Regla de UI:* Los perfiles con rol `landlord` son filtrados (`.neq('role', 'landlord')`) de los feeds de "People" (Home/Explore), ya que no buscan roomies, solo inquilinos.
2. **`host` (Roomie Anfitrión):** Persona que ya vive en un apartamento y está buscando un roomie para compartir los gastos.
3. **`seeker` (Roomie Buscador):** Persona que no tiene apartamento y está buscando un lugar para vivir o alguien con quien rentar algo nuevo. Es el rol por defecto al registrarse.
4. **`admin` (Administrador):** Rol añadido en junio 2026. Da acceso al panel `app/(admin)/` (usuarios, listings, contratos, pagos, reportes, verificaciones, settings). Gestionable desde `app/(admin)/users.tsx`. La selección de rol post-registro para los tres roles no-admin ocurre en `app/role-select.tsx` (flujo animado de 2 pasos). **Nota de seguridad:** la protección de las rutas admin es actualmente solo client-side; ver Regla Crítica #5 sobre `lib/supabaseAdmin.ts`.

---

## 📝 Registro de Actualizaciones (Changelog)

- **[1 de Mayo, 2026]:** Migración total de la app de Mocks Locales a Supabase (Auth, perfiles).
- **[7 de Mayo, 2026] - Refactorización Estructural:** 
  - Geocoding migrado a Nominatim OSM (CORS safe).
  - Implementación de Optimistic UI en `chat/[id].tsx`.
  - Búsqueda en vivo agregada a `inbox.tsx` usando `useFocusEffect` para trazabilidad de conversaciones.
  - Soporte para subida de fotos en el chat vía `chat_media` bucket.
  - Generación de scripts SQL para RLS en la tabla `messages`.
- **[13-14 de Mayo, 2026] - Optimización de Rendimiento, Vercel SPA y UI:**
  - Sustitución de componentes nativos de imagen por `expo-image` con caché habilitado en toda la app.
  - Navegación fluida eliminando recargas innecesarias (`useFocusEffect` -> `useEffect`) para persistencia en memoria.
  - Configuración para Producción (Vercel): Modo Single Page Application en `app.json` (`web.output: "single"`) y `vercel.json` con reescritura de rutas dinámicas.
  - Modificación del algoritmo en Home Feed: **Prioridad 1:** Distancia (>1km) -> **Prioridad 2:** Similitud (Fallback) garantizando que la lista no quede vacía.
  - UI de Perfil: Movidas las Suscripciones Premium a una pantalla dedicada `app/subscriptions.tsx` con acceso mediante un ícono de rueda dentada (⚙️) junto a la foto de perfil.
  - UI de Home: Agregado un Segmented Control (Slider) para alternar entre feed de personas ("People") y anuncios ("Apartments").
  - Estricta política global en Inglés: Traducción de labels restantes (Profile, Chats, Settings).
  - Sistema de Roles: Añadido soporte lógico para roles `landlord`, `host` y `seeker` con filtros en consultas.
- **[17-18 de Mayo, 2026] - Optimización de UX, Swiper y Paywall Mock:**
  - **Swiper Fix & Parches:** Se corrigieron los problemas de la interpolación de opacidad en `react-native-deck-swiper` para los botones LIKE/NOPE aplicando un parche permanente mediante `patch-package` y un script `postinstall`.
  - **Swiper en Web (Cross-Platform):** Se resolvió un error crítico en Web donde los swipes hacia Arriba (Message), Abajo (Skip) e Izquierda (Nope) quedaban "pegados". Esto sucedía porque los gestos nativos del navegador (Pull-to-refresh, Back navigation, Overscroll) secuestraban el `PanResponder`. La solución definitiva (Antigravity Rule) fue inyectar `document.body.style.overscrollBehavior = 'none'` y `touchAction = 'none'` en un `useEffect` para bloquear estos eventos de Safari/Chrome y devolver el control total a la app, además de aplicar `useViewOverflow={false}` y deshabilitar el "drag" nativo de las imágenes.
  - **Interacciones Web:** Se añadió `pointerEvents="box-none"` a los botones flotantes sobre el Swiper para prevenir que bloqueen el gesto de deslizamiento (swipe) en navegadores web.
  - **Paywall en Home Feed:** Se implementó una lógica de muro de pago. Los usuarios gratuitos (Free) ahora verán difuminados (`expo-blur`) los perfiles recomendados a partir de la quinta (5ta) posición, invitándolos a mejorar su plan.
  - **Manejo de Suscripción Mockeada:** Se actualizó la vista `subscriptions.tsx` para incluir un "Switch" que simula la activación del plan Premium, guardando el estado en `AsyncStorage` para probar fácilmente el paywall del Home Feed sin necesidad de afectar el backend (RLS de Supabase).
  - **Pull-to-Refresh:** Se añadió el gesto nativo de jalar para recargar (`RefreshControl`) en las listas de `index.tsx` para forzar la sincronización del estado visual de la suscripción.
- **[18-26 de Mayo, 2026] - Contratos Grupales y Fotos Múltiples:**
  - Soporte para múltiples fotos por perfil y por listing.
  - Sistema de **contratos multilaterales/grupales** (tablas `contracts` + `contract_participants`), con `ContractStepMatches.tsx` como selector de firmantes/roomies.
  - Generación de PDF de contratos: `expo-print` en nativo, `html2pdf.js` en Web; sube el resultado al bucket `contracts`.
  - Merge de la rama `feat/contratos-grupales`.
- **[1-2 de Junio, 2026] - Internacionalización:**
  - Motor de traducción EN/ES vía `context/LanguageContext.tsx` + diccionario estático `constants/translations.ts` (~1200 líneas), persistido en `AsyncStorage`. (Nota: pese al mensaje de commit original, no es un motor "dinámico" con IA — es un diccionario fijo con helpers para hobbies/dealbreakers/lifestyle.)
  - Pantalla de Settings localizada.
- **[5-6 de Junio, 2026] - Tutorial Interactivo (Coach-marks):**
  - `components/TutorialModal.tsx`: spotlight dinámico calculado con `useWindowDimensions`/safe-area insets, coordinado vía `DeviceEventEmitter`.
  - Disparadores para desarrolladores: tecla `+` o long-press del logo/tab bar.
  - Versionado por usuario (`@tutorial_version:{userId}`) y opción de "repetir tutorial" en Settings.
  - Grid responsive real en Home: `numColumns` dinámico (`width > 1000` → 3 columnas, `> 680` → 2, si no 1), reemplazando el enfoque anterior de max-width fijo.
- **[8-9 de Junio, 2026] - Trust Center:**
  - Nueva sección `app/trust/` (index, verify, report, tips) con `trust_score` calculado como `20 + 20 × verificaciones_aprobadas` (máx. 100).
  - **Nota:** las verificaciones (identidad, teléfono/SMS, redes sociales vía `TrustInstagramModal`) están simuladas con `setTimeout`, no conectadas a proveedores reales todavía.
- **[11-25 de Junio, 2026] - Mapas Reales y Optimización:**
  - Mapa real en Explore vía `react-native-maps` (nativo) / `leaflet`+`react-leaflet` (Web) a través de `components/MapViewWrapper.native.tsx` / `.tsx`.
  - Filtros de exploración (`app/explore/filters.tsx`), `ExploreMapView`, `ExploreSwipeControls`.
  - Optimizaciones de rendimiento en chat, inbox y explore; adopción parcial de `@tanstack/react-query` (`useProfileQueries`, `useInboxQueries` — `useExplore`/`useMatches` aún sin migrar).
- **[28 de Junio, 2026] - Panel de Administración, Roles Jerárquicos y Ciberseguridad:**
  - Nuevo rol **`admin`** y panel completo `app/(admin)/` (users, listings, contracts, payments, reports, verifications, settings), protegido solo a nivel client-side por ahora.
  - Ubicaciones reales en mapas, mensajería enriquecida (`components/chat/modals/`: forward, info de mensaje, settings de chat, visor de imágenes, menú de adjuntos).
  - Eliminación de cuenta vía RPC `delete_user`.
  - Conexión de verificaciones del Trust Center al panel admin (checkmarks de UI) y fix de diálogos de alerta en Web.
  - **🔴 Se introdujo `lib/supabaseAdmin.ts` con la Service Role Key de Supabase embebida y ofuscada en el código** para evitar el escaneo de secretos de GitHub — ver Regla Crítica #5. Pendiente de remediar (mover a backend/Edge Function y rotar la key).
- **[5-6 de Julio, 2026] - Administración de Contratos/Alojamiento, Reportes e Integraciones PMS:**
  - Módulo de administración de contratos y alojamiento (`app/(admin)/contracts.tsx`, `listings.tsx`) con bitácora de auditoría (`addAuditLog`) — actualmente solo en `AsyncStorage` local, no persistida en Supabase.
  - Sistema de reportes de usuarios (`user_reports`) integrado entre `app/trust/report.tsx` y la pestaña "conflicts" del panel admin.
  - Capa de integración con Property Management Systems (`lib/integrations/`): interfaz genérica `pms-interface.ts` + implementación completa para **Yardi Voyager** (corriendo en `simulationMode: true`, sin credenciales reales) y generador de feed **Zumper** (`app/api/zumper-feed+api.ts`, con datos mock, aún no conectado a la tabla `listings`).
  - Asistente de "IA" para sugerir cláusulas de contrato en `app/contracts/new.tsx` — actualmente un mock (`setTimeout` con 3 cláusulas fijas), no una llamada real a un modelo.
- **[7 de Julio, 2026] - Corrección de Seguridad (Service Role Key):**
  - Se eliminó `lib/supabaseAdmin.ts` (Service Role Key embebida y ofuscada en el bundle cliente) y los 4 imports muertos en `app/(admin)/{listings,users,contracts,verifications}.tsx`. No había uso funcional real (el cliente nunca se invocaba), así que la corrección no rompe nada.
  - Se creó `supabase/admin_rls_policies.sql` con políticas RLS explícitas (`is_admin()` + policies en `profiles`, `listings`, `contracts`, `verifications`, `user_reports`) para que las escrituras del panel admin sigan funcionando de forma segura, sin ninguna key privilegiada en el cliente. **Pendiente de ejecución manual por el usuario en el SQL Editor de Supabase.**
  - **Pendiente crítico, solo accionable por el humano:** rotar la Service Role Key expuesta desde el dashboard de Supabase (Project Settings → API), ya que quedó en el historial de git independientemente de la limpieza del working tree.

- **[10 de Julio, 2026] - Auditoría de Seguridad y Migraciones:**
  - Verificado vía Management API que las políticas RLS de admin **ya estaban activas en producción** desde antes (con nombres distintos a `admin_rls_policies.sql`, ver Regla Crítica #5). Ese script queda como referencia histórica, no se ejecuta.
  - Se creó `supabase/migrations/` (no existía) — baseline real generado con `supabase db pull` (requiere Colima/Docker local), historial remoto huérfano reparado con `supabase migration repair`.
  - **Pendiente sin confirmar:** rotación de la Service Role Key legacy — se pegó accidentalmente en el chat del agente de IA dos veces durante esta sesión (además de estar en el historial de git), lo cual es un canal de exposición adicional independiente de git.

- **[12 de Julio, 2026] - Trust Center: OTP real por email (Prioridad 2 de deuda técnica):**
  - Decisión de presupuesto: Stack B/Optimizado (ver `scratch/estimacion_costes_150k_mau.csv`) — se reemplaza Twilio SMS por email OTP, ya que el proyecto está en tier gratuito de Supabase, pre-ingresos.
  - Columna `profiles.is_phone_verified` renombrada a `is_email_verified` (migración `20260712164902_rename_phone_to_email_verification.sql`) — honestidad de producto: si el código llega al email, no se puede llamar "teléfono verificado". El slug interno `type='phone'` se mantiene sin cambio (compatibilidad con filas existentes en `verifications.type`), solo cambia lo que el usuario ve.
  - Nueva tabla `email_otp_codes` (solo hash del código, nunca texto plano; RLS habilitado sin políticas — solo la Service Role Key la toca).
  - **Descubrimiento importante:** los endpoints `app/api/*+api.ts` (incluido el feed de Zumper) **no corren en producción** bajo `web.output:"single"` + el rewrite catch-all de `vercel.json` — son código muerto en Vercel, solo funcionan en `expo start` local. Por eso el OTP se implementó como **Supabase Edge Function** (`supabase/functions/send-email-otp`, `verify-email-otp`), el patrón que ya recomendaba el propio `admin_rls_policies.sql` para operaciones privilegiadas. Si el feed de Zumper se retoma, debe migrarse al mismo patrón (Edge Function), no a una API route de Expo.
  - Identidad/antecedentes/social **no eran mock** — ya insertaban en `verifications` con `status:'pending'` para revisión manual del admin (confirmado leyendo `app/trust/verify.tsx`); el toggle `autoVerify` que se leía de `AsyncStorage` es local por dispositivo, no un ajuste real de servidor (deuda técnica menor, sin resolver, no bloqueante).
  - Verificación automatizada de identidad (Stripe Identity/Persona) queda **deliberadamente pospuesta** — decisión del usuario, revisar solo si el volumen lo justifica.
  - OAuth real de Instagram (`TrustInstagramModal`) queda **deliberadamente pospuesto** — requiere que el usuario cree una app en developers.facebook.com primero.
  - **Limitación conocida de Resend:** en modo sandbox (sin dominio verificado) solo se puede enviar a la propia cuenta de Resend del usuario (`jjpachecob2000@gmail.com`). Para que cualquier usuario real reciba su código hace falta verificar un dominio en resend.com/domains y actualizar el secreto `RESEND_FROM_EMAIL`. Confirmado con prueba end-to-end (`supabase/functions/verify-email-otp` maneja correctamente código incorrecto, código expirado, código malformado y rate-limit de reenvío).
  - **⏳ En progreso (12 de julio, 2026):** el dominio del proyecto es `roomiemates.com`. Se recomendó verificar el subdominio `mail.roomiemates.com` en Resend (separa la reputación de envío del dominio raíz) y agregar los registros DNS (SPF/DKIM/DMARC) que Resend genera al agregar el dominio — acción manual del usuario en su proveedor de DNS, no automatizable sin acceso a esa cuenta. Una vez verificado, falta: (1) actualizar el secreto `RESEND_FROM_EMAIL`, (2) opcionalmente crear una API key de Resend con permisos completos si se quiere gestionar dominios vía API en el futuro (la actual es solo de envío).
