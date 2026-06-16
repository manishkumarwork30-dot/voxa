import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTelephonyClientForAdmin } from "@/lib/telephony";
import { supabase } from "@/lib/supabase";

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

    // Allow ADMIN, USER, and SUPER_ADMIN roles to initiate calls
    if (decoded.role !== "ADMIN" && decoded.role !== "USER" && decoded.role !== "SUPER_ADMIN") {
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

      // Generate simulated transcript from flow if it exists
      let simulatedTranscript = "";
      const flow = agent.call_flow;
      if (flow && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
        simulatedTranscript = "Simulated Call:\n";
        flow.nodes.forEach((node: any) => {
          if (node.type === 'greeting') {
            simulatedTranscript += `Agent: "${node.message}"\nCustomer: "Hello! Yes, go ahead."\n\n`;
          } else if (node.type === 'question') {
            simulatedTranscript += `Agent: "${node.message}"\nCustomer: "Yeah, that makes sense."\n\n`;
          } else if (node.type === 'branch') {
            simulatedTranscript += `Agent: "${node.message}"\nCustomer: "Yes, definitely."\n\n`;
          } else if (node.type === 'collect_info') {
            simulatedTranscript += `Agent: "${node.message}"\nCustomer: "Sure, my details are John Doe and test@example.com."\n\n`;
          } else if (node.type === 'action') {
            simulatedTranscript += `Agent: [Action: ${node.message}]\n\n`;
          } else if (node.type === 'transfer') {
            simulatedTranscript += `Agent: "${node.message}"\n[Call transferred to senior executive]\n\n`;
          } else if (node.type === 'closing') {
            simulatedTranscript += `Agent: "${node.message}"\n`;
          }
        });
      } else {
        simulatedTranscript = `Simulated Call: This is a sandbox calling simulation. The voice agent successfully processed the call using system instructions: "${agent.system_prompt}"`;
      }

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
          transcript: simulatedTranscript,
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

    // Real call logic using unified telephony client resolved for this agent
    const { getTelephonyClientForAgent } = await import("@/lib/telephony");
    const { client: telephonyClient, remoteId, provider } = await getTelephonyClientForAgent(adminId, agent.vapi_agent_id);

    let phoneNumberId = admin.vapi_phone_number || "placeholder_phone_number_id";
    if (provider === 'RETELL') {
      phoneNumberId = admin.retell_phone_number || "placeholder_phone_number_id";
    } else if (provider === 'BLAND_AI') {
      phoneNumberId = admin.bland_phone_number || "placeholder_phone_number_id";
    } else if (provider === 'TELNYX') {
      phoneNumberId = admin.telnyx_phone_number || "placeholder_phone_number_id";
    }

    if (!phoneNumberId || phoneNumberId === 'placeholder_phone_number_id') {
      return NextResponse.json({
        error: `Phone Number ID not configured for ${provider}. Go to Settings → API Keys and add your ${provider} Phone Number ID.`
      }, { status: 400 });
    }

    
    const callResponse = await telephonyClient.makeOutboundCall({
      phoneNumber,
      assistantId: remoteId,
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
        vapi_call_id: callResponse.id || `call_${Date.now()}`,
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
        rawResponse: callResponse.rawResponse,
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