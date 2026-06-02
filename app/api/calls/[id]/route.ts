import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or invalid" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string; adminId?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    let query = supabase.from("calls").select("*").eq("id", id);

    if (decoded.role === "SUPER_ADMIN") {
      // no extra filter
    } else if (decoded.role === "ADMIN") {
      query = query.eq("admin_id", decoded.userId!);
    } else if (decoded.role === "USER") {
      const adminId = decoded.adminId || decoded.userId;
      query = query.eq("admin_id", adminId!);
    } else {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data: call, error } = await query.single();

    if (error || !call) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        call: {
          id: call.id,
          vapi_call_id: call.vapi_call_id,
          agent_id: call.agent_id,
          campaign_id: call.campaign_id,
          direction: call.direction,
          caller_number: call.caller_number,
          duration_sec: call.duration_sec,
          status: call.status,
          transcript: call.transcript,
          recording_url: call.recording_url,
          cost_usd: call.cost_usd,
          created_at: call.created_at,
          ended_at: call.ended_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}