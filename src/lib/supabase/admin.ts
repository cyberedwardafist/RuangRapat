import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Klien dengan kunci service role. HANYA dipakai di server (route handler / server component).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
