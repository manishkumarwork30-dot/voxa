import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { getVapiClientForAdmin, getLanguageCode } from "@/lib/vapi";
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

// ─────────────────────────────────────────────
// GET /api/agents — list agents
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (decoded.role !== "ADMIN" && decoded.role !== "USER" && decoded.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from("agents").select("*").order("created_at", { ascending: false });

  if (decoded.role !== "SUPER_ADMIN") {
    const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
    query = query.eq("admin_id", adminId!);
  }

  // Filter by type if requested
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type && ["VOICE", "CHAT", "BOTH"].includes(type)) {
    query = query.eq("type", type);
  }

  const { data: agents, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });

  return NextResponse.json({ agents: agents || [], count: agents?.length || 0 });
}

// ─────────────────────────────────────────────
// POST /api/agents — create agent (+ VAPI sync for voice agents)
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await request.json();
  const {
    name, language, voice_model, system_prompt, flow_builder, tone,
    type = "VOICE", template_id, call_flow, chat_config,
  } = body;

  if (!name || !language || !system_prompt) {
    return NextResponse.json({ error: "Please provide name, language, and system_prompt" }, { status: 400 });
  }

  // Voice agents need a voice_model
  if ((type === "VOICE" || type === "BOTH") && !voice_model) {
    return NextResponse.json({ error: "Voice agents require a voice_model" }, { status: 400 });
  }

  const validLanguages = ["HINDI", "ENGLISH", "HINGLISH"];
  if (!validLanguages.includes(language)) {
    return NextResponse.json({ error: "Invalid language. Must be HINDI, ENGLISH, or HINGLISH" }, { status: 400 });
  }

  const validTypes = ["VOICE", "CHAT", "BOTH"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be VOICE, CHAT, or BOTH" }, { status: 400 });
  }

  const adminId = decoded.userId!;

  // Check admin exists + plan limits
  const { data: admin } = await supabase.from("users").select("is_active, plan, vapi_api_key").eq("id", adminId).single();
  if (!admin?.is_active) return NextResponse.json({ error: "Admin not found or inactive" }, { status: 404 });

  const { count: currentCount } = await supabase.from("agents").select("id", { count: "exact", head: true }).eq("admin_id", adminId);
  const maxAgents = admin.plan === "ENTERPRISE" ? 1000 : admin.plan === "PRO" ? 5 : 1;
  if ((currentCount ?? 0) >= maxAgents) {
    return NextResponse.json({ error: `Agent limit reached for ${admin.plan} plan (max ${maxAgents})` }, { status: 403 });
  }

  // Compile flow prompt if provided
  let finalPrompt = system_prompt;
  if (call_flow && call_flow.nodes && call_flow.nodes.length > 0) {
    finalPrompt = compileFlowToPrompt(call_flow, system_prompt);
  }

  // Try to create real VAPI agent (only for VOICE or BOTH types)
  let vapiAgentId = `placeholder_${Date.now()}`;
  let vapiLinked = false;

  if ((type === "VOICE" || type === "BOTH") && admin.vapi_api_key) {
    try {
      const vapiClient = await getVapiClientForAdmin(adminId);
      const langCode = getLanguageCode(language);
      const vapiAgent = await vapiClient.createAgent({
        name,
        systemPrompt: finalPrompt,
        voiceId: voice_model,
        language: langCode,
      });
      if (vapiAgent?.id) {
        vapiAgentId = vapiAgent.id;
        vapiLinked = true;
      }
    } catch (err) {
      console.error("VAPI agent creation failed (will use placeholder):", err);
    }
  } else if (type === "CHAT") {
    // Chat-only agents don't need VAPI
    vapiAgentId = `chat_${Date.now()}`;
  }

  // Save to DB
  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      name,
      language,
      voice_model: voice_model || "none",
      system_prompt,
      flow_builder: flow_builder || { blocks: [] },
      tone: tone || "friendly",
      type,
      template_id: template_id || null,
      call_flow: call_flow || { nodes: [], edges: [] },
      chat_config: chat_config || {
        welcome_message: "Hello! How can I help you?",
        theme_color: "#6366f1",
        position: "bottom-right",
      },
      admin_id: adminId,
      vapi_agent_id: vapiAgentId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Agent created successfully", agent: { ...agent, vapi_linked: vapiLinked } },
    { status: 201 }
  );
}