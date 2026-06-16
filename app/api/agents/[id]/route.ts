import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { getTelephonyClientForAdmin } from "@/lib/telephony";
import { compileFlowToPrompt } from "@/lib/flow-compiler";

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

// GET /api/agents/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
  let query = supabase.from("agents").select("*").eq("id", id);
  if (decoded.role !== "SUPER_ADMIN") query = query.eq("admin_id", adminId!);

  const { data: agent, error } = await query.single();
  if (error || !agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  return NextResponse.json({ agent });
}

// PATCH /api/agents/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const adminId = decoded.userId!;
  const { id } = await params;

  // Check ownership
  const { data: existingAgent } = await supabase
    .from("agents").select("*").eq("id", id).eq("admin_id", adminId).single();
  if (!existingAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await request.json();
  const { name, system_prompt, voice_model, language, status, flow_builder, tone, type, call_flow, chat_config } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name) updates.name = name;
  if (system_prompt) updates.system_prompt = system_prompt;
  if (voice_model) updates.voice_model = voice_model;
  if (language) updates.language = language;
  if (status) updates.status = status;
  if (flow_builder) updates.flow_builder = flow_builder;
  if (tone) updates.tone = tone;
  if (type) updates.type = type;
  if (call_flow) updates.call_flow = call_flow;
  if (chat_config) updates.chat_config = chat_config;

  // Compile flow-based prompt for VAPI sync
  const currentPrompt = system_prompt || existingAgent.system_prompt;
  let compiledPrompt = currentPrompt;
  const currentFlow = call_flow || existingAgent.call_flow;
  if (currentFlow && currentFlow.nodes && currentFlow.nodes.length > 0) {
    compiledPrompt = compileFlowToPrompt(currentFlow, currentPrompt);
  }

  // Sync to VAPI if linked (only for VOICE / BOTH agents)
  const agentType = type || existingAgent.type || "VOICE";
  if (
    (agentType === "VOICE" || agentType === "BOTH") &&
    existingAgent.vapi_agent_id &&
    !existingAgent.vapi_agent_id.startsWith("placeholder_") &&
    !existingAgent.vapi_agent_id.startsWith("chat_")
  ) {
    try {
      const { getTelephonyClientForAgent } = await import("@/lib/telephony");
      const { client: telephonyClient, remoteId } = await getTelephonyClientForAgent(adminId, existingAgent.vapi_agent_id);
      const targetLang = language || existingAgent.language;
      const langCode = targetLang === 'HINDI' ? 'hi' : targetLang === 'HINGLISH' ? 'hinglish' : 'en';
      await telephonyClient.updateAgent(remoteId, {
        name: name || existingAgent.name,
        systemPrompt: compiledPrompt,
        voiceId: voice_model || existingAgent.voice_model,
        language: langCode,
      });
    } catch (err) {
      console.error("Telephony agent update failed:", err);
    }
  }

  const { data: agent, error } = await supabase
    .from("agents").update(updates).eq("id", id).select("*").single();

  if (error) return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  return NextResponse.json({ message: "Agent updated", agent });
}

// DELETE /api/agents/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const adminId = decoded.userId!;
  const { id } = await params;
  const { data: existingAgent } = await supabase
    .from("agents").select("*").eq("id", id).eq("admin_id", adminId).single();
  if (!existingAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Delete from Telephony provider first
  if (existingAgent.vapi_agent_id && !existingAgent.vapi_agent_id.startsWith("placeholder_") && !existingAgent.vapi_agent_id.startsWith("chat_")) {
    try {
      const { getTelephonyClientForAgent } = await import("@/lib/telephony");
      const { client: telephonyClient, remoteId } = await getTelephonyClientForAgent(adminId, existingAgent.vapi_agent_id);
      await telephonyClient.deleteAgent(remoteId);
    } catch (err) {
      console.error("Telephony agent deletion failed:", err);
    }
  }

  // Mark as DELETED in DB (soft delete)
  await supabase.from("agents").update({ status: "DELETED" }).eq("id", id);

  return NextResponse.json({ message: "Agent deleted" });
}