// Permite a un usuario autenticado simular su propio estado de premium
// mientras Stripe todavía no está configurado — pensado solo para pruebas
// (QA, demos) antes de tener claves reales, mismo espíritu que el
// `simulationMode` de Yardi o el modo mock de Zumper.
//
// Se autodesactiva sola en cuanto STRIPE_SECRET_KEY/STRIPE_PRICE_ID existan:
// una vez Stripe está configurado, esta función rechaza cualquier intento de
// auto-otorgarse premium — la única fuente de verdad pasa a ser
// stripe-webhook. Esto es deliberado: no debe quedar una puerta trasera para
// premium gratis una vez haya cobros reales.
//
// Las filas que crea se distinguen con stripe_subscription_id = 'test_simulated'
// para que el admin (app/(admin)/payments.tsx) pueda diferenciarlas de
// suscripciones reales de Stripe si llegan a coexistir.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const TEST_MARKER = 'test_simulated';

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

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeConfigured = Boolean(Deno.env.get('STRIPE_SECRET_KEY') && Deno.env.get('STRIPE_PRICE_ID'));
    if (stripeConfigured) {
      return new Response(
        JSON.stringify({ success: false, message: 'Test mode is disabled — Stripe is configured. Use real checkout.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: { active?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // sin body -> se interpreta como desactivar
    }
    const active = body.active === true;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (active) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { error } = await admin.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_customer_id: null,
          stripe_subscription_id: TEST_MARKER,
          stripe_price_id: null,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    } else {
      const { error } = await admin
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('stripe_subscription_id', TEST_MARKER);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, active }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('toggle-test-subscription error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
