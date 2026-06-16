import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET) as {
      role?: string; userId?: string; adminId?: string;
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GET /api/chat/conversations — list conversations
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
  if (!adminId) return NextResponse.json({ error: "Admin context not found" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabaseAdmin.from("chat_conversations")
    .select("id, admin_id, agent_id, visitor_name, visitor_email, visitor_phone, status, intent_result, created_at, ended_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Super Admin sees all, others see their own
  if (decoded.role !== "SUPER_ADMIN") {
    query = query.eq("admin_id", adminId);
  }

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: conversations, error } = await query;
  if (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }

  return NextResponse.json({
    conversations: conversations || [],
    count: conversations?.length || 0,
  });
}
