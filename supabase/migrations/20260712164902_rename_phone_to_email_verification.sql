-- Trust Center: replace mocked SMS phone verification with real email OTP.
-- Budget decision (Stack B / "Optimizado", ver scratch/estimacion_costes_150k_mau.csv):
-- Twilio SMS OTP reemplazado por email, ya que el proyecto está en etapa
-- pre-ingresos. Como el código ahora llega al correo, no al teléfono,
-- renombramos la columna para no mentirle al usuario sobre qué se verificó.
alter table public.profiles
  rename column is_phone_verified to is_email_verified;

-- Códigos OTP de un solo uso para verificación de email.
-- Nunca se guarda el código en texto plano, solo su hash.
create table public.email_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_otp_codes_user_id_idx on public.email_otp_codes(user_id);

-- Esta tabla solo la toca la Edge Function (send-email-otp / verify-email-otp)
-- usando la Service Role Key como secreto de servidor. RLS habilitado sin
-- políticas = ningún cliente normal (anon/authenticated) puede leer ni
-- escribir aquí directamente, ni siquiera su propia fila.
alter table public.email_otp_codes enable row level security;
