# Handoff — roommatefinder-app

> Generado el 2026-07-28, actualizado el 2026-07-29. Pensado para que una conversación nueva (con Claude Code u otra persona) entienda en 2 minutos dónde quedó todo, sin tener que releer el historial completo.

## Estado general

El proyecto venía de una auditoría de "¿está listo para vender a Oni?" con 9 bloqueantes rojos + 4 amarillos/grises. **Todos los bloqueantes de código ya están cerrados, y Stripe ya quedó conectado y probado en modo Test (2026-07-29).** Lo único que sigue abierto es la decisión de negocio/legal para pasar a modo LIVE con dinero real (cuenta de Stripe en Costa Rica) — ver sección "Pendiente abierto" abajo. No bloquea seguir desarrollando ni probando.

## Bloqueantes rojos — cerrados

- **Git identity**: no era un problema real (colaborador `Theron123` confirmado por el dueño del proyecto).
- **CI/CD**: GitHub Actions con 3 jobs (`app`, `edge-functions`, `db-tests`), Jest para lógica pura, Deno test para edge functions, pgTAP para regresiones de RLS.
- **Admin audit log**: migrado de AsyncStorage a Supabase (`admin_audit_log` + RLS admin-only), helper compartido en `lib/adminAuditLog.ts`.
- **Zumper**: lado *push* (`zumper-feed`) desplegado real a producción. Lado *pull* (`import-listings-sync`) sigue en modo mock — bloqueado porque falta que Oni entregue `ZUMPER_FEED_URL`/`ZUMPER_API_TOKEN`, no es responsabilidad nuestra.
- **Yardi**: bloqueado por lo mismo (credenciales de terceros), explícitamente aceptado así por el dueño.
- **Service Role Key expuesta**: rotación confirmada por el dueño (fuera de esta sesión).
- **Stripe/paywall real**: ver sección dedicada abajo — esta es la pieza grande de hoy.
- **App nativa / mejor soporte iOS**: decisión explícita del dueño de **no** hacer una app nativa por ahora; prioridad es que la web app funcione bien en iOS/web. No se tocó en esta sesión.

## Amarillos/grises — cerrados

- `.env` sacado de git (estaba trackeado), `.env.example` creado como plantilla.
- Política de privacidad real en `app/privacy-policy.tsx` (reemplazó un `Alert.alert()` de 2 líneas).
- `useExplore.ts` / `useMatches.ts` migrados a React Query.
- Dependencia sin uso (`react-native-google-places-autocomplete`) eliminada.

## Stripe: Premium + Renta (el trabajo de hoy)

Dos flujos de pago reales, sin SDK de Stripe (fetch directo a su API REST — decisión deliberada, ver "Convenciones" abajo):

| Flujo | Modo Stripe | Tabla | Edge Functions |
|---|---|---|---|
| Premium (suscripción mensual) | `subscription` | `subscriptions` | `create-checkout-session`, `stripe-webhook` |
| Renta (pago manual mensual) | `payment` (monto dinámico vía `price_data`) | `rent_payments` | mismas dos funciones, `body.type: 'rent'` |

Ambas comparten `create-checkout-session` (un solo endpoint, branch por `type`) y `stripe-webhook` (branch por `session.metadata.type`).

**Modo de prueba sin Stripe real**: mientras no haya `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`, `app/subscriptions.tsx` muestra un slider que simula premium vía `toggle-test-subscription` (marca la fila con `stripe_subscription_id = 'test_simulated'`). Se autodesactiva sola (403) en cuanto Stripe esté configurado — no puede usarse como puerta trasera una vez haya cobros reales.

**Ya desplegado a producción** (proyecto `jwzcvozwygsfkouclhrz`):
- Migraciones `subscriptions` y `rent_payments` (vía `supabase db push`)
- Edge functions: `create-checkout-session`, `stripe-webhook` (`--no-verify-jwt`), `stripe-status`, `toggle-test-subscription`

**✅ Stripe conectado y probado en modo Test (2026-07-29)** — los 3 secrets están seteados en Supabase:
- `STRIPE_SECRET_KEY` — cuenta de Stripe en sandbox/test mode
- `STRIPE_PRICE_ID` — producto "Premium", $10/mes recurrente (`price_1TyR84F2vX9jRNZMILxBH2ZD`)
- `STRIPE_WEBHOOK_SECRET` — destino de webhook apuntando a `https://jwzcvozwygsfkouclhrz.supabase.co/functions/v1/stripe-webhook`, escuchando los 5 eventos (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`)

Como Stripe ya está configurado, `stripe-status` ahora devuelve `configured: true` — el slider de modo prueba en `app/subscriptions.tsx` ya no debería aparecer, y "Suscribirme"/"Rent Now" deberían ir al Checkout real de Stripe. **Falta probar el flujo completo con la tarjeta de test `4242 4242 4242 4242`** y confirmar que el estado en la app y en `/payments` (admin) se actualiza después del pago.

**Admin `/payments`**: ya conectado a datos reales (Premium/Free/Conversión desde `subscriptions`, badge de Stripe real vía `stripe-status`) — antes eran números hardcodeados en 0.

**Archivos clave**:
- `supabase/functions/_shared/stripe.ts` — cliente Stripe (fetch directo, sin SDK)
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-status/index.ts`, `supabase/functions/toggle-test-subscription/index.ts`
- `app/subscriptions.tsx`, `app/rent-payment/[id].tsx`, `app/(admin)/payments.tsx`
- `supabase/migrations/20260726180000_add_subscriptions.sql`, `supabase/migrations/20260728190000_add_rent_payments.sql`

## Pendiente abierto: pasar a modo LIVE (dinero real)

El dueño del proyecto está en Costa Rica. **Verificado en vivo en stripe.com/global: Costa Rica no está en la lista de países soportados directamente por Stripe.** Esto no impidió conectar el modo **Test** (ver arriba, ya funciona), pero si Stripe exige una cuenta completamente verificada para habilitar payouts reales, esta decisión va a resurgir cuando se quiera cobrar dinero de verdad. Caminos que se le presentaron:

1. **Stripe Atlas** (incorporar una empresa en EE.UU.) — usa el código tal cual, pero implica trámites legales/fiscales reales.
2. Buscar otro procesador de pagos que sí opere directo en Costa Rica — implicaría rehacer la integración con otra API.
3. Pausar la decisión por ahora.

**El dueño eligió pausar esta decisión** (la de modo LIVE) — no afecta que el modo Test ya esté andando. Cuando decida pasar a producción real, hay que repetir los mismos 3 pasos (producto, clave, webhook) pero con el interruptor "Test mode" apagado en Stripe, y volver a correr `supabase secrets set` con los valores `sk_live_`/`whsec_` nuevos (Live y Test son cuentas completamente separadas en Stripe).

## Bug de infraestructura — resuelto (2026-07-30)

`supabase/migrations/20260712204303_fix_roommate_bucket_public_write.sql` y `20260712205300_fix_contracts_bucket_private_signed_urls.sql` fallaban de forma intermitente en un arranque 100% limpio (sin backup cacheado) — error `relation "storage.buckets" does not exist`. Confirmado como **carrera real, no determinística**: el mismo comando (`supabase stop --no-backup && supabase start`) falló 2/2 veces en un momento y pasó 7/7 veces más tarde — el contenedor de storage crea su propio schema (`storage.buckets`/`storage.objects`) de forma asíncrona respecto a las migraciones del proyecto.

**Fix**: ambas migraciones ahora envuelven su lógica en un `DO $$ ... $$` que espera hasta 30s a que `storage.buckets` exista (`to_regclass('storage.buckets')`); si nunca aparece, hace `RAISE NOTICE` y sale sin error en vez de tumbar toda la cadena de migraciones. Verificado: 4 cold-starts reales seguidos sin fallo, la ruta degradada probada aparte contra Postgres puro (espera los 30s completos y sale limpio), buckets/policies confirmados creados, y las 8 pruebas de `supabase test db` pasando después del arranque limpio. Esto probablemente también arregla el job `db-tests` de CI (corre en runner limpio, mismo escenario).

Nota para el futuro: son migraciones ya aplicadas en producción — el edit no las re-ejecuta ahí (Supabase trackea por nombre de archivo/versión), solo afecta entornos que arrancan desde cero (CI, `db reset`, clones nuevos).

## Convenciones / gotchas del entorno (aprendidos a las malas)

- **Nunca usar el SDK de Stripe (`npm:stripe` ni `esm.sh/stripe`)** en las edge functions — ya hubo problemas de resolución npm/jsr en Deno en este proyecto. Todo Stripe se hace con fetch directo (`supabase/functions/_shared/stripe.ts`).
- **`tsc` corrido repetidamente en este directorio de trabajo da falsos negativos** (especialmente después de `expo start`). Para un veredicto confiable: clonar a un directorio aparte (`git clone .`), `npm ci`, y correr `tsc`/`eslint`/`deno check` ahí.
- **Deploy de edge functions requiere `TMPDIR` custom**: Colima solo monta `$HOME` por defecto, pero el bundler de Supabase escribe en `/var/folders/...` (fuera de `$HOME`). Antes de `supabase functions deploy`, correr `export TMPDIR="$HOME/.tmp-supabase-deploy/"` (con el directorio ya creado).
- **El bundler de deploy de Supabase no soporta imports fuera de `supabase/functions/`** — todo lo compartido entre funciones vive en `supabase/functions/_shared/`, nunca se importa desde `lib/` o rutas relativas que salgan de `supabase/functions/`.
- **Dos remotos de git**: `origin` (repo real) y `fork` (`Theron123`, de donde Vercel despliega el frontend). **El dueño maneja el push al fork él mismo — nunca pushear ahí.** Solo `git push origin main`.
- **Patrón de commits**: cambios de código en un commit, luego `graphify update .` + commit aparte "Update graphify code graph after...".
- Los tokens/API keys que aparecen pegados en el chat históricamente han necesitado rotación — si aparece uno nuevo, avisar y rotarlo, no solo advertir.

## Sugerencia de próximos pasos

1. **Probar el flujo completo de Stripe en modo Test** (Premium y Renta) con la tarjeta `4242 4242 4242 4242` — confirmar que el webhook actualiza `subscriptions`/`rent_payments` y que se refleja en la app y en `/payments` (admin). Esto todavía no se hizo end-to-end tras conectar las claves.
2. Cuando el dueño resuelva la cuenta de Stripe para modo LIVE (Atlas u otra vía), repetir producto+clave+webhook en modo real.
3. Nada más está bloqueando el proyecto — el resto de los bloqueantes rojos originales están cerrados, incluyendo el bug de infraestructura de arriba.
