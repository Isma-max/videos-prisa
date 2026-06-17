import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente de servidor. Usa la service_role key, así que SOLO debe importarse
// desde código de servidor (route handlers, server components). Nunca lo
// expongas en el bundle del cliente.
let _serverClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. " +
        "Cópialas desde Supabase > Project Settings > API a tu .env.local."
    );
  }

  _serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _serverClient;
}
