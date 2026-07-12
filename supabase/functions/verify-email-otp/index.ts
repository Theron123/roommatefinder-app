// Verifies the 6-digit code sent by send-email-otp, then marks the caller's
// own profile as email-verified. Runs with the Service Role Key as a server
// secret (never exposed to the client) — this is the pattern documented at
// the bottom of supabase/admin_rls_policies.sql for privileged operations
// RLS can't express on its own.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
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

    const { code } = await req.json();
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return new Response(JSON.stringify({ success: false, message: 'Enter the 6-digit code.' }), {
        status: 200,
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: pending } = await admin
      .from('email_otp_codes')
      .select('id, code_hash, expires_at, attempts')
      .eq('user_id', user.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fail = (message: string) =>
      new Response(JSON.stringify({ success: false, message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    if (!pending) {
      return fail('No pending code. Please request a new one.');
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return fail('This code has expired. Please request a new one.');
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      return fail('Too many incorrect attempts. Please request a new code.');
    }

    const submittedHash = await hashCode(code);
    if (submittedHash !== pending.code_hash) {
      await admin
        .from('email_otp_codes')
        .update({ attempts: pending.attempts + 1 })
        .eq('id', pending.id);
      return fail('Incorrect code.');
    }

    await admin.from('email_otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', pending.id);

    const { data: profile } = await admin
      .from('profiles')
      .select('is_identity_verified, is_background_verified, is_social_verified')
      .eq('id', user.id)
      .single();

    const verifiedCount =
      1 + // this email verification
      (profile?.is_identity_verified ? 1 : 0) +
      (profile?.is_background_verified ? 1 : 0) +
      (profile?.is_social_verified ? 1 : 0);
    const trustScore = 20 + verifiedCount * 20;

    await admin
      .from('profiles')
      .update({ is_email_verified: true, trust_score: trustScore })
      .eq('id', user.id);

    await admin.from('verifications').insert({
      user_id: user.id,
      type: 'phone',
      status: 'approved',
      metadata: { method: 'email_otp', verified_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('verify-email-otp error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Unexpected server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
