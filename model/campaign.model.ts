// model/campaign.model.ts
// TypeScript types for the Supabase `campaigns` table.

import { supabase } from "@/lib/supabase";

export interface CampaignRow {
  id: string;
  name: string;
  admin_id: string;
  agent_id: string;
  type: "INBOUND" | "OUTBOUND";
  contacts: string[];
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  scheduled_at: string | null;
  created_at: string;
}

export type CampaignInsert = Omit<CampaignRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type CampaignUpdate = Partial<Omit<CampaignRow, "id" | "created_at">>;

const campaigns = () => supabase.from("campaigns");

const Campaign = {
  async findById(id: string) {
    const { data, error } = await campaigns().select("*").eq("id", id).single();
    if (error) return null;
    return data as unknown as CampaignRow;
  },

  async findOne(filter: Partial<CampaignRow>) {
    let query = campaigns().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as unknown as CampaignRow;
  },

  async find(filter: Partial<CampaignRow> = {}, options?: { orderBy?: string; ascending?: boolean }) {
    let query = campaigns().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as unknown as CampaignRow[];
  },

  async create(values: CampaignInsert) {
    const { data, error } = await campaigns().insert(values as Record<string, unknown>).select("*").single();
    if (error) throw error;
    return data as unknown as CampaignRow;
  },

  async updateById(id: string, values: CampaignUpdate) {
    const { data, error } = await campaigns().update(values as Record<string, unknown>).eq("id", id).select("*").single();
    if (error) throw error;
    return data as unknown as CampaignRow;
  },
};

export default Campaign;