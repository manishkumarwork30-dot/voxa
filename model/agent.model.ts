// model/agent.model.ts
// TypeScript types for the Supabase `agents` table.

import { supabase } from "@/lib/supabase";

export interface AgentRow {
  id: string;
  name: string;
  vapi_agent_id: string;
  language: "HINDI" | "ENGLISH" | "HINGLISH";
  voice_model: string;
  system_prompt: string;
  status: "ACTIVE" | "PAUSED" | "DELETED";
  admin_id: string;
  created_at: string;
}

export type AgentInsert = Omit<AgentRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type AgentUpdate = Partial<Omit<AgentRow, "id" | "created_at">>;

const agents = () => supabase.from("agents");

const Agent = {
  async findById(id: string) {
    const { data, error } = await agents().select("*").eq("id", id).single();
    if (error) return null;
    return data as unknown as AgentRow;
  },

  async findOne(filter: Partial<AgentRow>) {
    let query = agents().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as unknown as AgentRow;
  },

  async find(filter: Partial<AgentRow> = {}, options?: { orderBy?: string; ascending?: boolean }) {
    let query = agents().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as unknown as AgentRow[];
  },

  async count(filter: Partial<AgentRow> = {}) {
    let query = agents().select("id", { count: "exact", head: true });
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  },

  async create(values: AgentInsert) {
    const { data, error } = await agents().insert(values as Record<string, unknown>).select("*").single();
    if (error) throw error;
    return data as unknown as AgentRow;
  },

  async updateById(id: string, values: AgentUpdate) {
    const { data, error } = await agents().update(values as Record<string, unknown>).eq("id", id).select("*").single();
    if (error) throw error;
    return data as unknown as AgentRow;
  },
};

export default Agent;