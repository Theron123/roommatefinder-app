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
   - **⚠️ Excepciones activas sin resolver (deuda técnica, no seguir como ejemplo):** el asistente de "IA" que sugiere cláusulas en `app/contracts/new.tsx` es un `setTimeout` que devuelve 3 cláusulas fijas; las verificaciones del Trust Center (identidad, teléfono, redes sociales) en `app/trust/verify.tsx` están simuladas (SMS de prueba `123456`, login falso de Instagram); la sincronización con Yardi corre en `simulationMode: true`; el feed de Zumper usa datos mock en vez de la tabla `listings`. Cualquier IA que continúe este proyecto debe conectar estos módulos a datos/servicios reales antes de darlos por terminados, no asumir que ya están completos porque existen visualmente.

5. **🔴 Regla de Seguridad Crítica (Service Role Key):**
   - `lib/supabaseAdmin.ts` contiene la **Service Role Key de Supabase embebida y ofuscada** (concatenada en 4 fragmentos, con comentario explícito de que es "para bypasear GitHub Push Protection"). Se importa desde varias pantallas de `app/(admin)/` (`listings.tsx`, `users.tsx`, `contracts.tsx`, `verifications.tsx`).
   - Esto es una vulnerabilidad grave: al compilar para Web, la clave queda en el bundle JS servido al navegador, bypaseando por completo RLS. Cualquiera con acceso a la app web puede extraerla e interactuar con la base de datos sin restricciones.
   - **Esto contradice la regla original del documento** ("los scripts SQL deben entregarse al usuario porque la IA no tiene la Service Role Key"). Esa premisa ya no es cierta: la key SÍ está en el repo.
   - **Acción requerida (pendiente):** mover toda lógica que dependa de `supabaseAdmin` a una Edge Function o backend propio, sacar la key del bundle cliente, y rotar la key expuesta. No agregar más usos de `lib/supabaseAdmin.ts` en código que compile a Web hasta resolver esto.
   - La protección de rutas del panel admin (`app/(admin)/_layout.tsx`) también es solo client-side (verifica `profiles.role === 'admin'` en el front); su seguridad real depende de políticas RLS server-side no confirmadas en el repo.

---

## 🗄 4. Arquitectura de Base de Datos y Storage

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
- **Actualizado (jun 2026):** esta regla asumía que la IA no tenía la Service Role Key. Ya no es así — `lib/supabaseAdmin.ts` la tiene embebida en el bundle cliente, lo cual es en sí mismo el problema (ver Regla Crítica #5 en la sección 3). Los scripts SQL para configuraciones que requieran privilegios elevados y no deban vivir en el cliente (migraciones, policies nuevas) se deben seguir entregando al usuario para ejecutar manualmente en el dashboard de Supabase — no agregarlas al código del cliente.

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
