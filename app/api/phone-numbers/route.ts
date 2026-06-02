import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getVapiClientForAdmin } from "@/lib/vapi";
import { supabase } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET) as {
      role?: string; userId?: string;
    };
  } catch { return null; }
}

// GET /api/phone-numbers — list VAPI phone numbers for this admin
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  try {
    const vapiClient = await getVapiClientForAdmin(decoded.userId!);
    const numbers = await vapiClient.listPhoneNumbers();
    return NextResponse.json({ phone_numbers: Array.isArray(numbers) ? numbers : numbers?.results || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch phone numbers" }, { status: 400 });
  }
}

// POST /api/phone-numbers — link a phone number to an agent for inbound routing
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { phone_number_id, agent_id } = await request.json();
  if (!phone_number_id || !agent_id) {
    return NextResponse.json({ error: "phone_number_id and agent_id are required" }, { status: 400 });
  }

  // Verify agent belongs to this admin
  const { data: agent } = await supabase
    .from("agents").select("vapi_agent_id").eq("id", agent_id).eq("admin_id", decoded.userId!).single();
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const vapiClient = await getVapiClientForAdmin(decoded.userId!);
    await vapiClient.linkPhoneNumberToAgent(phone_number_id, agent.vapi_agent_id);
    return NextResponse.json({ message: "Phone number linked to agent successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to link phone number" }, { status: 400 });
  }
}
