// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env"
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Privileged service-role client for server-side admin actions
 * (e.g. creating the super-admin row directly).
 * Falls back to the anon client when no service key is configured,
 * so the app still boots in dev without the key.
 */
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
export const supabaseAdmin: SupabaseClient = serviceKey
  ? createClient(supabaseUrl, serviceKey)
  : supabase;
