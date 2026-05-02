import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwzcvozwygsfkouclhrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3emN2b3p3eWdzZmtvdWNsaHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NDEsImV4cCI6MjA4Mjk4MTg0MX0.orkIs_LSdKNNmUxvNq4GbRsJsxRbYSjcqYpcc2kX0Pg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'geo12345@gmail.com';
  const password = 'password123';
  
  console.log(`Intentando registrar: ${email} con contraseña: ${password}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Error al registrar:", error.message);
  } else {
    console.log("¡Usuario registrado exitosamente!");
    console.log("ID del usuario:", data.user?.id);
    if (data.session) {
      console.log("¡La sesión está activa! (La confirmación de email está correctamente desactivada)");
    } else {
      console.log("Ojo: La sesión es null. Esto significa que 'Confirm Email' SIGUE activo en Supabase.");
    }
  }
}

main();
