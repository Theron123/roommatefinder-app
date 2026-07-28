// Endpoint público que Stripe llama directo (sin sesión de nuestros
// usuarios) cada vez que pasa algo con un pago. Es la ÚNICA fuente de verdad
// para el estado real de `subscriptions` y `rent_payments` —
// create-checkout-session nunca marca nada como activo/pagado por sí mismo,
// solo Stripe confirmando el pago vía este webhook.
//
// checkout.session.completed llega para AMBOS flujos (premium y renta); se
// distingue por session.metadata.type, seteado al crear la Checkout Session
// en _shared/stripe.ts (createCheckoutSession vs createRentCheckoutSession).
//
// Se despliega con --no-verify-jwt (igual que zumper-feed) porque Stripe no
// manda un JWT de Supabase; en cambio, cada request viene firmado con el
// header Stripe-Signature, verificado abajo contra STRIPE_WEBHOOK_SECRET.
//
// Secrets requeridos (`supabase secrets set ...`):
//   STRIPE_SECRET_KEY     - para consultar el detalle real de la subscription
//   STRIPE_WEBHOOK_SECRET - del endpoint configurado en el Dashboard de Stripe
//
// Configuración pendiente en Stripe (Dashboard → Developers → Webhooks):
// apuntar el endpoint a esta función y suscribirlo a los eventos
// checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, customer.subscription.updated y
// customer.subscription.deleted.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getSubscription, verifyStripeSignature } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!webhookSecret || !secretKey) {
      console.error('STRIPE_WEBHOOK_SECRET o STRIPE_SECRET_KEY no configurados');
      return new Response('Not configured', { status: 501 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('Stripe-Signature');
    const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.metadata?.type === 'rent') {
        // payment_status es 'paid' para la gran mayoría de métodos (tarjeta);
        // queda 'unpaid' solo en métodos diferidos, que se resuelven después
        // vía checkout.session.async_payment_succeeded/failed más abajo.
        const userId = session.client_reference_id;
        const listingId = session.metadata?.listing_id;
        const period = session.metadata?.period;
        if (userId && listingId && period) {
          await admin
            .from('rent_payments')
            .update({
              stripe_customer_id: session.customer,
              status: session.payment_status === 'paid' ? 'paid' : 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('listing_id', listingId)
            .eq('period', period);
        }
      } else if (session.client_reference_id && session.subscription) {
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        const sub = await getSubscription(secretKey, subscriptionId);
        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            stripe_price_id: session.line_items?.data?.[0]?.price?.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed') {
      // Métodos de pago diferidos (ej. transferencias bancarias): el checkout
      // se completa pero la confirmación real del cobro llega después.
      const session = event.data.object;
      const userId = session.client_reference_id;
      const listingId = session.metadata?.listing_id;
      const period = session.metadata?.period;
      if (session.metadata?.type === 'rent' && userId && listingId && period) {
        await admin
          .from('rent_payments')
          .update({
            stripe_customer_id: session.customer,
            status: event.type === 'checkout.session.async_payment_succeeded' ? 'paid' : 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('listing_id', listingId)
          .eq('period', period);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      // Cubre también pagos de invoice fallidos: Stripe actualiza el status
      // real de la subscription (past_due, unpaid, canceled, ...) según su
      // propia lógica de reintentos, y dispara este mismo evento — leer
      // sub.status en vez de forzar 'canceled' a la primera falla evita
      // cortarle el acceso a alguien en medio de la ventana de reintento.
      const sub = event.data.object;
      await admin
        .from('subscriptions')
        .update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return new Response(JSON.stringify({ received: false, error: 'Unexpected server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
