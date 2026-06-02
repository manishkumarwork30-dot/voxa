import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET) as {
      role?: string; userId?: string; adminId?: string;
    };
  } catch { return null; }
}

// GET /api/leads/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
  let query = supabase.from("leads").select("*, campaigns(name), calls(*)").eq("id", id);
  if (decoded.role !== "SUPER_ADMIN") query = query.eq("admin_id", adminId!);

  const { data: lead, error } = await query.single();
  if (error || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json({ lead });
}

// PATCH /api/leads/[id] — update lead status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { status, customer_name, email } = await request.json();
  const validStatuses = ["NEW", "CONTACTED", "CONVERTED", "REJECTED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (customer_name) updates.customer_name = customer_name;
  if (email) updates.email = email;

  const { data: lead, error } = await supabase
    .from("leads").update(updates).eq("id", id).eq("admin_id", decoded.userId!).select("*").single();

  if (error || !lead) return NextResponse.json({ error: "Lead not found or update failed" }, { status: 404 });
  return NextResponse.json({ message: "Lead updated", lead });
}
