import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for API routes. In a real deployment you'd use
 * a service-role key here (server-only, not NEXT_PUBLIC_) for privileged
 * writes. The anon key is used as a demo fallback.
 */
let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (cached) return cached;
  cached = createClient(url, key);
  return cached;
}

export function hasSupabase(): boolean {
  return getServerSupabase() !== null;
}
