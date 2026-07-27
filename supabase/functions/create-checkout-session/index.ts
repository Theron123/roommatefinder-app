// Crea una Stripe Checkout Session para que el usuario autenticado se
// suscriba a Premium. El cliente (app/subscriptions.tsx) llama esta función
// y abre la URL devuelta — el estado real de la suscripción NUNCA se marca
// aquí, solo lo confirma stripe-webhook cuando Stripe realmente cobra.
//
// Secrets requeridos (`supabase secrets set ...`):
//   STRIPE_SECRET_KEY - clave secreta de Stripe (test o live)
//   STRIPE_PRICE_ID   - id del Price de Stripe para el plan Premium (price_...)
//   SITE_URL          - opcional, base para success_url/cancel_url por defecto
//                       si el cliente no manda las suyas
//
// Corre en modo "no configurado" mientras no existan estos secrets — responde
// 501 con un mensaje claro en vez de fallar de forma confusa, mismo patrón
// que ya usan las integraciones de Yardi/Zumper en este proyecto.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createCheckoutSession } from '../_shared/stripe.ts';

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
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!secretKey || !priceId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Los pagos con Stripe todavía no están configurados.' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://roomiemates.com';
    let body: { successUrl?: string; cancelUrl?: string } = {};
    try {
      body = await req.json();
    } catch {
      // sin body es válido, se usan los defaults de siteUrl
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
