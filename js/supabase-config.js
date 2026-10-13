/* =====================================================================
   Servicios Ghost — Configuración de Supabase
   ---------------------------------------------------------------------
   Pega aquí los dos datos de tu proyecto de Supabase.
   Los encuentras en: Supabase → tu proyecto → Project Settings → API

     SUPABASE_URL      -> "Project URL"  (ej. https://xxxx.supabase.co)
     SUPABASE_ANON_KEY -> "anon public"  (una clave larga que empieza por eyJ...)

   ⚠️ IMPORTANTE:
   - Estos dos valores son PÚBLICOS y seguros de poner aquí (están
     diseñados para usarse en el navegador).
   - NUNCA pongas aquí la clave "service_role" (esa es secreta).
   - La seguridad real la dan las políticas (RLS) que configuras en
     Supabase: el cliente solo puede LEER; solo tú (admin con sesión
     iniciada) puedes ESCRIBIR.

   Mientras no pongas estos valores, la web funciona igual usando los
   restaurantes de data.js como respaldo.
   ===================================================================== */

const SUPABASE_URL = "";       // 👈 pega tu Project URL
const SUPABASE_ANON_KEY = "";  // 👈 pega tu anon public key

// Nombre del "bucket" (carpeta en la nube) donde se guardan las fotos.
// Debes crear uno con este nombre en Supabase → Storage.
const SUPABASE_BUCKET = "fotos";
