// model/user.model.ts
// TypeScript types for the Supabase `users` table.
// Replaces the old Mongoose schema.

import { supabase } from "@/lib/supabase";

/** Row shape returned by Supabase for the `users` table. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  is_active: boolean;
  last_login: string | null;
  created_by: string | null;
  created_at: string;
  vapi_api_key: string | null;
  vapi_phone_number: string | null;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  subscription_status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIAL";
  monthly_calls_limit: number;
  monthly_calls_used: number;
  stripe_customer_id: string | null;
  billing_cycle_end: string | null;
}

/** Fields accepted when creating a new user row. */
export type UserInsert = Omit<UserRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

/** Fields accepted when updating a user row. */
export type UserUpdate = Partial<Omit<UserRow, "id" | "created_at">>;

// ---- Helper query builders (thin wrappers) ----

const users = () => supabase.from("users");

const User = {
  /** Find a single user by id. */
  async findById(id: string) {
    const { data, error } = await users()
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as unknown as UserRow;
  },

  /** Find a single user matching a filter. */
  async findOne(filter: Partial<UserRow>) {
    let query = users().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as unknown as UserRow;
  },

  /** Find many users matching a filter. */
  async find(filter: Partial<UserRow> = {}, options?: { orderBy?: string; ascending?: boolean }) {
    let query = users().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as unknown as UserRow[];
  },

  /** Insert a new user row. Returns the inserted row. */
  async create(values: UserInsert) {
    const { data, error } = await users()
      .insert(values as Record<string, unknown>)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as UserRow;
  },

  /** Update a user by id. Returns the updated row. */
  async updateById(id: string, values: UserUpdate) {
    const { data, error } = await users()
      .update(values as Record<string, unknown>)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as UserRow;
  },
};

export default User;
