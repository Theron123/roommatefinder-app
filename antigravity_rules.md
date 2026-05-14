# Antigravity Rules & Project Architecture - Roommate Finder

Este documento es la **fuente de la verdad** técnica y arquitectónica del proyecto `roommatefinder-app`. 
**Nota para la IA (Antigravity):** Lee SIEMPRE este documento al inicio de una sesión para comprender el contexto global del proyecto, la estructura de carpetas, las decisiones previas y las reglas estrictas de código.

---

## 🏗 1. Stack Tecnológico Principal
- **Framework:** Expo (SDK 54) / React Native 0.81 (Cross-platform: iOS, Android, Web).
- **Enrutamiento:** Expo Router v6 (File-based routing en la carpeta `app/`).
- **BaaS (Backend):** Supabase (`@supabase/supabase-js` v2.91).
- **Estilos y UI:** StyleSheet nativo, `@expo/vector-icons`, gradientes (`expo-linear-gradient`), y carga de imágenes nativa (`expo-image-picker`).

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

---

## 🗄 4. Arquitectura de Base de Datos y Storage

### A. Tablas Principales (Supabase PostgreSQL)
- **`profiles`:** 
  - Centraliza a todos los usuarios.
  - Campos clave: `id`, `name`, `age`, `photoUrl`, `lat`, `lng`, `location_name`, `bio`.
- **`messages`:** 
  - Almacena el historial de chat 1 a 1.
  - Campos clave: `id`, `sender_id`, `receiver_id`, `content`, `media_url`, `media_type`, `created_at`.
  - **Replicación:** `Realtime` habilitado para permitir WebSockets.

### B. Storage (Multimedia)
- **`chat_media` (Bucket Público):** Usado para almacenar las fotos e imágenes enviadas en el chat. Genera URLs públicas (`getPublicUrl`) que se guardan en la tabla `messages`.

### C. Seguridad (Row Level Security - RLS)
- RLS está **ESTRICTAMENTE ACTIVADO** en todas las tablas sensibles.
- Los usuarios solo pueden insertar registros si el `sender_id` coincide con su `auth.uid()`.
- Los scripts automatizados SQL deben entregarse al usuario para configuraciones críticas que la IA no puede hacer por falta de llave maestra (Service Role Key).

---

## 🎭 5. Sistema de Roles (Jerarquía)

La aplicación maneja tres roles principales para diferenciar la intención de los usuarios:

1. **`landlord` (Propietario):** Persona que tiene un apartamento para rentar, pero **NO** vive allí. Solo quiere publicar propiedades. *Regla de UI:* Los perfiles con rol `landlord` son filtrados (`.neq('role', 'landlord')`) de los feeds de "People" (Home/Explore), ya que no buscan roomies, solo inquilinos.
2. **`host` (Roomie Anfitrión):** Persona que ya vive en un apartamento y está buscando un roomie para compartir los gastos.
3. **`seeker` (Roomie Buscador):** Persona que no tiene apartamento y está buscando un lugar para vivir o alguien con quien rentar algo nuevo. Es el rol por defecto al registrarse.

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
