import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { getVapiClientForAdmin } from "@/lib/vapi";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function POST(request: NextRequest) {
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

    // Allow ADMIN and USER roles to initiate calls
    if (decoded.role !== "ADMIN" && decoded.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { phoneNumber, agentId, simulate = false } = body;

    // Validation
    if (!phoneNumber || !agentId) {
      return NextResponse.json(
        { error: "Please provide phone number and agent ID" },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,14}$/im;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Determine Admin ID
    const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
    if (!adminId) {
      return NextResponse.json(
        { error: "Parent Admin ID not found in token context" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to this admin
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("admin_id", adminId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found or does not belong to this admin" },
        { status: 404 }
      );
    }

    // Check if admin exists and is active
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (adminError || !admin || !admin.is_active) {
      return NextResponse.json(
        { error: "Workspace Admin not found or inactive" },
        { status: 404 }
      );
    }

    // SaaS Call limit check
    const callsLimit = admin.monthly_calls_limit || 100;
    const callsUsed = admin.monthly_calls_used || 0;
    if (callsUsed >= callsLimit) {
      return NextResponse.json(
        { error: `Monthly calling limit reached (${callsUsed}/${callsLimit}). Please upgrade your SaaS plan.` },
        { status: 403 }
      );
    }

    // Perform check for sandbox simulation
    const isMock = simulate || !admin.vapi_api_key;

    if (isMock) {
      // Increment call count
      await supabase
        .from("users")
        .update({ monthly_calls_used: (admin.monthly_calls_used || 0) + 1 })
        .eq("id", adminId);

      // Simulate Sandbox Call
      const { data: callRecord, error: callError } = await supabase
        .from("calls")
        .insert({
          vapi_call_id: `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          admin_id: adminId,
          agent_id: agent.id,
          direction: "OUTBOUND",
          caller_number: phoneNumber,
          status: "COMPLETED",
          duration_sec: Math.floor(Math.random() * 90) + 30,
          transcript: "Simulated Call: This is a sandbox calling simulation. The voice agent successfully processed the lead without active VAPI billing credentials.",
          cost_usd: 0.0,
        })
        .select("*")
        .single();

      if (callError) {
        console.error("Supabase insert error:", callError);
        return NextResponse.json({ error: "Failed to create call record" }, { status: 500 });
      }

      return NextResponse.json(
        {
          message: "Outbound call simulated successfully (Sandbox Mode)",
          call: {
            id: callRecord.id,
            vapi_call_id: callRecord.vapi_call_id,
            status: callRecord.status,
            created_at: callRecord.created_at,
          },
        },
        { status: 201 }
      );
    }

    // Real call logic using VAPI client
    const vapiClient = await getVapiClientForAdmin(adminId);

    const phoneNumberId = admin.vapi_phone_number || "placeholder_phone_number_id";
    
    const vapiResponse = await vapiClient.makeOutboundCall({
      phoneNumber,
      assistantId: agent.vapi_agent_id,
      phoneNumberId
    });

    // Increment call count
    await supabase
      .from("users")
      .update({ monthly_calls_used: (admin.monthly_calls_used || 0) + 1 })
      .eq("id", adminId);

    // Create the call record
    const { data: callRecord, error: callError } = await supabase
      .from("calls")
      .insert({
        vapi_call_id: vapiResponse.id || `vapi_${Date.now()}`,
        admin_id: adminId,
        agent_id: agent.id,
        direction: "OUTBOUND",
        caller_number: phoneNumber,
        status: "INITIATED",
      })
      .select("*")
      .single();

    if (callError) {
      console.error("Supabase insert error:", callError);
      return NextResponse.json({ error: "Failed to create call record" }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Outbound call initiated successfully",
        call: {
          id: callRecord.id,
          vapi_call_id: callRecord.vapi_call_id,
          status: callRecord.status,
          created_at: callRecord.created_at,
        },
        vapiResponse: vapiResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Make outbound call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}