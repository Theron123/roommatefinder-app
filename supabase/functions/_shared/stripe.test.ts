import { assertEquals } from 'jsr:@std/assert@1';
import { createCheckoutSession, getSubscription, verifyStripeSignature } from './stripe.ts';

// Genera una firma Stripe-Signature válida para poder testear el verificador
// sin depender de una cuenta real de Stripe — usa exactamente el mismo
// esquema que Stripe documenta (HMAC-SHA256 de "{timestamp}.{payload}").
async function signPayload(payload: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

Deno.test('verifyStripeSignature - acepta una firma válida y reciente', async () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const header = await signPayload(payload, secret, Math.floor(Date.now() / 1000));

  assertEquals(await verifyStripeSignature(payload, header, secret), true);
});

Deno.test('verifyStripeSignature - rechaza si el secret no coincide', async () => {
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const header = await signPayload(payload, 'whsec_correcto', Math.floor(Date.now() / 1000));

  assertEquals(await verifyStripeSignature(payload, header, 'whsec_incorrecto'), false);
});

Deno.test('verifyStripeSignature - rechaza si el payload fue alterado después de firmar', async () => {
  const secret = 'whsec_test_secret';
  const original = JSON.stringify({ amount: 100 });
  const header = await signPayload(original, secret, Math.floor(Date.now() / 1000));
  const tampered = JSON.stringify({ amount: 999999 });

  assertEquals(await verifyStripeSignature(tampered, header, secret), false);
});

Deno.test('verifyStripeSignature - rechaza un timestamp fuera de la ventana de tolerancia (replay)', async () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min, > 300s de tolerancia
  const header = await signPayload(payload, secret, oldTimestamp);

  assertEquals(await verifyStripeSignature(payload, header, secret), false);
});

Deno.test('verifyStripeSignature - rechaza si falta el header', async () => {
  assertEquals(await verifyStripeSignature('{}', null, 'whsec_test_secret'), false);
});

Deno.test('verifyStripeSignature - rechaza un header mal formado', async () => {
  assertEquals(await verifyStripeSignature('{}', 'esto-no-es-un-header-valido', 'whsec_test_secret'), false);
});

Deno.test('createCheckoutSession - arma el request y mapea la respuesta de Stripe', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedBody = '';
  globalThis.fetch = ((url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedBody = init.body as string;
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123', customer: null }), {
        status: 200,
      })
    );
  }) as typeof fetch;

  try {
    const session = await createCheckoutSession('sk_test_123', {
      priceId: 'price_abc',
      successUrl: 'https://roomiemates.com/ok',
      cancelUrl: 'https://roomiemates.com/cancel',
      clientReferenceId: 'user-1',
      customerEmail: 'test@example.com',
    });

    assertEquals(capturedUrl, 'https://api.stripe.com/v1/checkout/sessions');
    assertEquals(capturedBody.includes('mode=subscription'), true);
    assertEquals(capturedBody.includes('client_reference_id=user-1'), true);
    assertEquals(session.id, 'cs_test_123');
    assertEquals(session.url, 'https://checkout.stripe.com/pay/cs_test_123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('createCheckoutSession - propaga el mensaje de error real de Stripe si la request falla', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ error: { message: 'No such price: price_invalido' } }), { status: 400 })
    )) as typeof fetch;

  try {
    let threw = false;
    try {
      await createCheckoutSession('sk_test_123', {
        priceId: 'price_invalido',
        successUrl: 'https://x',
        cancelUrl: 'https://x',
        clientReferenceId: 'user-1',
      });
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, 'No such price: price_invalido');
    }
    assertEquals(threw, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('getSubscription - trae el status y la fecha de fin de periodo', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((url: string) => {
    assertEquals(url, 'https://api.stripe.com/v1/subscriptions/sub_123');
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'sub_123', customer: 'cus_1', status: 'active', current_period_end: 1800000000 }), {
        status: 200,
      })
    );
  }) as typeof fetch;

  try {
    const sub = await getSubscription('sk_test_123', 'sub_123');
    assertEquals(sub.status, 'active');
    assertEquals(sub.current_period_end, 1800000000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
