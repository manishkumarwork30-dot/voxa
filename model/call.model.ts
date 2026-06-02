// model/call.model.ts
// TypeScript types for the Supabase `calls` table.

import { supabase } from "@/lib/supabase";

export interface CallRow {
  id: string;
  vapi_call_id: string;
  admin_id: string;
  agent_id: string;
  campaign_id: string | null;
  direction: "INBOUND" | "OUTBOUND";
  caller_number: string;
  duration_sec: number;
  status: "INITIATED" | "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER";
  transcript: string | null;
  recording_url: string | null;
  cost_usd: number | null;
  created_at: string;
  ended_at: string | null;
}

export type CallInsert = Omit<CallRow, "id" | "created_at" | "ended_at"> & {
  id?: string;
  created_at?: string;
  ended_at?: string;
};

export type CallUpdate = Partial<Omit<CallRow, "id" | "created_at">>;

const calls = () => supabase.from("calls");

const Call = {
  async findById(id: string) {
    const { data, error } = await calls().select("*").eq("id", id).single();
    if (error) return null;
    return data as unknown as CallRow;
  },

  async findOne(filter: Partial<CallRow>) {
    let query = calls().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as unknown as CallRow;
  },

  async find(filter: Partial<CallRow> = {}, options?: { orderBy?: string; ascending?: boolean }) {
    let query = calls().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as unknown as CallRow[];
  },

  async create(values: CallInsert) {
    const { data, error } = await calls().insert(values as Record<string, unknown>).select("*").single();
    if (error) throw error;
    return data as unknown as CallRow;
  },

  async updateOne(filter: Partial<CallRow>, values: CallUpdate) {
    let query = calls().update(values as Record<string, unknown>);
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data as unknown as CallRow;
  },

  async updateById(id: string, values: CallUpdate) {
    const { data, error } = await calls().update(values as Record<string, unknown>).eq("id", id).select("*").single();
    if (error) throw error;
    return data as unknown as CallRow;
  },
};

export default Call;