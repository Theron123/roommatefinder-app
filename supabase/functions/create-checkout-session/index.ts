// Crea una Stripe Checkout Session para el usuario autenticado. Soporta dos
// flujos (`body.type`, default 'premium'):
//   - 'premium': suscripción recurrente mensual (mode: subscription).
//   - 'rent':    pago manual de renta de un mes puntual (mode: payment, monto
//                dinámico vía price_data porque varía según el listing).
// El cliente (app/subscriptions.tsx / pantalla de pago de renta) llama esta
// función y abre la URL devuelta — el estado real NUNCA se marca aquí, solo
// lo confirma stripe-webhook cuando Stripe realmente cobra.
//
// Secrets requeridos (`supabase secrets set ...`):
//   STRIPE_SECRET_KEY - clave secreta de Stripe (test o live)
//   STRIPE_PRICE_ID   - id del Price de Stripe para el plan Premium (price_...),
//                       solo se usa para type: 'premium'
//   SITE_URL          - opcional, base para success_url/cancel_url por defecto
//                       si el cliente no manda las suyas
//
// Corre en modo "no configurado" mientras no existan estos secrets — responde
// 501 con un mensaje claro en vez de fallar de forma confusa, mismo patrón
// que ya usan las integraciones de Yardi/Zumper en este proyecto.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createCheckoutSession, createRentCheckoutSession } from '../_shared/stripe.ts';

interface CheckoutRequestBody {
  type?: 'premium' | 'rent';
  successUrl?: string;
  cancelUrl?: string;
  // Solo para type: 'rent'
  amountCents?: number;
  listingId?: string;
  period?: string; // 'YYYY-MM'
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user?.email) {
      return new Response(JSON.stringify({ success: false, message: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Los pagos con Stripe todavía no están configurados.' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://roomiemates.com';
    let body: CheckoutRequestBody = {};
    try {
      body = await req.json();
    } catch {
      // sin body es válido para 'premium', se usan los defaults de siteUrl
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (body.type === 'rent') {
      const { amountCents, listingId, period } = body;
      if (!amountCents || !Number.isInteger(amountCents) || amountCents <= 0 || !listingId || !period) {
        return new Response(
          JSON.stringify({ success: false, message: 'Faltan datos: amountCents, listingId y period son requeridos.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si ya existe un pago 'paid' para este mismo listing+mes, no se vuelve
      // a cobrar — evita un doble cobro accidental por doble click/reintento.
      const { data: existingPayment } = await admin
        .from('rent_payments')
        .select('status, stripe_customer_id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .eq('period', period)
        .maybeSingle();

      if (existingPayment?.status === 'paid') {
        return new Response(
          JSON.stringify({ success: false, message: 'La renta de este mes ya fue pagada.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reutiliza el customer de Stripe de una suscripción o pago de renta previo.
      const { data: existingSub } = await admin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const customerId = existingSub?.stripe_customer_id || existingPayment?.stripe_customer_id || undefined;

      const session = await createRentCheckoutSession(secretKey, {
        amountCents,
        listingId,
        period,
        successUrl: body.successUrl || `${siteUrl}/rent-payment?checkout=success`,
        cancelUrl: body.cancelUrl || `${siteUrl}/rent-payment?checkout=cancelled`,
        clientReferenceId: user.id,
        customerId,
        customerEmail: customerId ? undefined : user.email,
      });

      const { error: upsertError } = await admin.from('rent_payments').upsert(
        {
          user_id: user.id,
          listing_id: listingId,
          amount_cents: amountCents,
          status: 'pending',
          period,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,listing_id,period' }
      );
      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ success: true, url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // type: 'premium' (default)
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!priceId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Los pagos con Stripe todavía no están configurados.' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reutiliza el customer de Stripe si el usuario ya tuvo una suscripción antes.
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const session = await createCheckoutSession(secretKey, {
      priceId,
      successUrl: body.successUrl || `${siteUrl}/subscriptions?checkout=success`,
      cancelUrl: body.cancelUrl || `${siteUrl}/subscriptions?checkout=cancelled`,
      clientReferenceId: user.id,
      customerId: existing?.stripe_customer_id || undefined,
      customerEmail: existing?.stripe_customer_id ? undefined : user.email,
    });

    return new Response(JSON.stringify({ success: true, url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
