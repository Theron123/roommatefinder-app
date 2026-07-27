// Cliente mínimo de Stripe hecho con fetch directo a su API REST — mismo
// estilo que ya usa send-email-otp con Resend (sin SDK), para no depender de
// `npm:stripe` en Deno (ya tuvimos problemas de resolución npm/jsr en este
// proyecto — ver notas en supabase/functions/deno.json y CI). Stripe firma
// bien su API REST clásica, así que no hace falta el SDK para esto.

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer: string | null;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number; // unix seconds
}

function toFormBody(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) usp.append(key, String(value));
  }
  return usp.toString();
}

async function stripeRequest<T>(
  secretKey: string,
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = `https://api.stripe.com/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'POST' && params ? toFormBody(params) : undefined,
  });

  const body = await res.json();
  if (!res.ok) {
    const message = body?.error?.message || `Stripe respondió ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

// Crea una Stripe Checkout Session en modo suscripción. `clientReferenceId`
// debe ser el id del usuario en nuestra tabla profiles, para poder mapear el
// evento de vuelta a nuestro usuario cuando llegue el webhook.
export async function createCheckoutSession(
  secretKey: string,
  params: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    clientReferenceId: string;
    customerId?: string;
    customerEmail?: string;
  }
): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(secretKey, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': params.priceId,
    'line_items[0][quantity]': 1,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.clientReferenceId,
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
  });
}

// Trae el estado real y vigente de una subscription (usado tras
// checkout.session.completed, que no siempre trae el status final).
export async function getSubscription(secretKey: string, subscriptionId: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>(secretKey, 'GET', `/subscriptions/${subscriptionId}`);
}

// Verifica la firma `Stripe-Signature` de un webhook: HMAC-SHA256 del string
// `{timestamp}.{rawBody}` con el webhook secret, comparado en tiempo
// constante contra el/los valor(es) v1 del header. También rechaza eventos
// más viejos que `toleranceSeconds` (por defecto 300s, igual que Stripe) para
// evitar ataques de repetición.
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key === 't' || key === 'v1') {
      (acc[key] ||= []).push(value);
    }
    return acc;
  }, {} as Record<string, string[]>);

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some((sig) => timingSafeEqualHex(sig, expected));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}
