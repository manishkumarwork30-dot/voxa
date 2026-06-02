// lib/db.ts
// Supabase replacement for the old MongoDB connection helper.
// All API routes that previously called `await dbConnect()` can still import
// this file – the function is now a no-op since Supabase doesn't need an
// explicit connection step.

import { supabase, supabaseAdmin } from "./supabase";

/**
 * Backward-compatible no-op.
 * Mongoose required an explicit connection; Supabase does not.
 */
export async function dbConnect(): Promise<void> {
  // No connection step needed for Supabase – the client is always ready.
  return;
}

/** Re-export Supabase clients for convenience. */
export { supabase, supabaseAdmin };

export default dbConnect;
