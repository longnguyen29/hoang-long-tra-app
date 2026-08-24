import { createClient } from "@supabase/supabase-js";

// Service-role client for server-only routes that must bypass RLS (same pattern already used
// in lib/telegram.js). Never import this from client code.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
