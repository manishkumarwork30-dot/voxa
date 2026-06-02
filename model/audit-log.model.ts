// model/audit-log.model.ts
// TypeScript types for the Supabase `audit_logs` table.

import { supabase } from "@/lib/supabase";

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type AuditLogInsert = Omit<AuditLogRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

const auditLogs = () => supabase.from("audit_logs");

const AuditLog = {
  async create(values: AuditLogInsert) {
    const { data, error } = await auditLogs().insert(values as Record<string, unknown>).select("*").single();
    if (error) throw error;
    return data as unknown as AuditLogRow;
  },

  async find(filter: Partial<AuditLogRow> = {}, options?: { orderBy?: string; ascending?: boolean }) {
    let query = auditLogs().select("*");
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value as string);
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as unknown as AuditLogRow[];
  },
};

export default AuditLog;