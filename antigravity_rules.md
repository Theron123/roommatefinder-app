# Antigravity Rules & Project Tracking - Roommate Finder

Este archivo está diseñado para que Antigravity (tu asistente de IA) y tú puedan **llevar un registro claro de la documentación y los últimos cambios** en el proyecto `roommatefinder-app`. Al mantener este archivo actualizado, nos aseguramos de no perder el contexto de lo que hemos avanzado.

## 🚀 Comandos Rápidos

### Iniciar la App (Expo)
Dado que es un proyecto de React Native con Expo, para correrlo debes ejecutar en la terminal:
```bash
npm start
```
*(O también `npx expo start`). Esto abrirá la interfaz de Metro bundler, desde donde puedes correrlo en iOS (`i`), Android (`a`) o Web (`w`).*

## 📝 Registro de Actualizaciones (Changelog)
*Por favor, documentar aquí los cambios importantes que vayamos haciendo en el proyecto.*

### [26 de Abril, 2026] - Estado Actual
- **Framework base:** Expo / React Native Web.
- **Enrutamiento:** Expo Router.
- **Base de Datos:** Configurando / Integrando Supabase (`@supabase/supabase-js` v2.91.1).

### [1 de Mayo, 2026] - Migración a Supabase
- **Base de Datos:** Se crearon las tablas SQL reales (`profiles`) con Row Level Security.
- **Frontend:** Se eliminó la dependencia de `MOCK_PROFILES` y se refactorizaron las pantallas (Explore, Home, Inbox, MyProfile, Login, Preferences, Chat) para consultar y actualizar datos directamente desde Supabase.

---

**Nota para Antigravity:** Siempre revisar este archivo al inicio de una nueva sesión o tarea grande asociada a `roommatefinder-app`, y agregar una nueva nota en el "Registro de Actualizaciones" al terminar un feature significativo.
