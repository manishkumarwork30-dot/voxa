/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTelephonyClientForAdmin } from "@/lib/telephony";
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

// GET /api/phone-numbers — list phone numbers for this admin's active provider
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  try {
    const client = await getTelephonyClientForAdmin(decoded.userId!);
    const numbers = await client.listPhoneNumbers();
    return NextResponse.json({ phone_numbers: numbers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch phone numbers" }, { status: 400 });
  }
}

// POST /api/phone-numbers — link a phone number to an agent OR purchase a new number
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  try {
    const body = await request.json();
    const { action, area_code, country_code, phone_number_id, agent_id } = body;

    const client = await getTelephonyClientForAdmin(decoded.userId!);

    // Handle Buy Number action
    if (action === "buy") {
      const purchaseResult = await client.buyPhoneNumber(area_code, country_code);
      
      // If purchase succeeded, optionally update admin's bland_phone_number field in DB
      if (purchaseResult && purchaseResult.phone_number) {
        await supabase
          .from("users")
          .update({ bland_phone_number: purchaseResult.phone_number })
          .eq("id", decoded.userId!);
      }

      return NextResponse.json({
        message: "Phone number purchased successfully",
        result: purchaseResult,
      });
    }

    // Default action: Link Phone Number to Agent
    if (!phone_number_id || !agent_id) {
      return NextResponse.json({ error: "phone_number_id and agent_id are required" }, { status: 400 });
    }

    // Verify agent belongs to this admin
    const { data: agent } = await supabase
      .from("agents").select("vapi_agent_id").eq("id", agent_id).eq("admin_id", decoded.userId!).single();
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    await client.linkPhoneNumberToAgent(phone_number_id, agent.vapi_agent_id);
    return NextResponse.json({ message: "Phone number linked to agent successfully" });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
  }
}
