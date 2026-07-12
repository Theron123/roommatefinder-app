// Sends a 6-digit one-time code to the caller's own account email, to back
// the "phone" verification slot in the Trust Center (renamed to email OTP,
// see supabase/migrations/20260712164902_rename_phone_to_email_verification.sql
// and scratch/estimacion_costes_150k_mau.csv for the budget decision behind
// swapping Twilio SMS for email).
//
// Secrets required (set once via `supabase secrets set`):
//   RESEND_API_KEY   - from https://resend.com/api-keys
//   RESEND_FROM_EMAIL - optional, defaults to Resend's sandbox sender
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Basic anti-spam: don't allow re-sending within the cooldown window.
    const { data: recent } = await admin
      .from('email_otp_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please wait a bit before requesting a new code.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = Array.from(crypto.getRandomValues(new Uint32Array(1)))[0] % 1000000;
    const codeStr = code.toString().padStart(6, '0');
    const codeHash = await hashCode(codeStr);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    // Invalidate any previous unconsumed codes, then store the new one.
    await admin.from('email_otp_codes').delete().eq('user_id', user.id).is('consumed_at', null);
    const { error: insertErr } = await admin.from('email_otp_codes').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ success: false, message: 'Email service is not configured yet.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'RoommateFinder <onboarding@resend.dev>';
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: user.email,
        subject: `${codeStr} es tu código de verificación`,
        html: `<p>Tu código de verificación de RoommateFinder es:</p><h2 style="letter-spacing:4px">${codeStr}</h2><p>Vence en ${CODE_TTL_MINUTES} minutos. Si no solicitaste esto, ignora este correo.</p>`,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('Resend error:', resendRes.status, errBody);
      return new Response(
        JSON.stringify({ success: false, message: 'Could not send the verification email.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email-otp error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
