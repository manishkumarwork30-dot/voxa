import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const token = 
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      role?: string; userId?: string; adminId?: string;
    };
    console.log("DEBUG getAuth: decoded payload:", decoded);
    return decoded;
  } catch (err: any) {
    console.error("DEBUG getAuth: verification failed:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// GET /api/agent-templates — list templates
// Super Admin sees ALL, Admin sees only visible
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabaseAdmin.from("agent_templates")
    .select("*")
    .order("created_at", { ascending: false });

  // Admins & Users only see visible templates
  if (decoded.role !== "SUPER_ADMIN") {
    query = query.eq("is_visible", true);
  }

  // Filter by type if requested
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type && ["VOICE", "CHAT", "BOTH"].includes(type)) {
    query = query.eq("type", type);
  }

  const category = searchParams.get("category");
  if (category) {
    query = query.eq("category", category);
  }

  const { data: templates, error } = await query;
  if (error) {
    console.error("Failed to fetch agent templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }

  // For non-super-admins, also filter premium templates based on plan
  let filteredTemplates = templates || [];
  if (decoded.role === "ADMIN") {
    const adminId = decoded.userId;
    const { data: admin } = await supabaseAdmin
      .from("users")
      .select("plan")
      .eq("id", adminId!)
      .single();

    if (admin?.plan === "STARTER") {
      filteredTemplates = filteredTemplates.filter((t: Record<string, unknown>) => !t.is_premium);
    }
  }

  return NextResponse.json({
    templates: filteredTemplates,
    count: filteredTemplates.length,
  });
}

// ─────────────────────────────────────────────
// POST /api/agent-templates — create template
// Super Admin only
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can create templates" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    description,
    type = "VOICE",
    category = "GENERAL",
    default_prompt,
    default_voice = "sarah",
    default_language = "HINDI",
    default_tone = "friendly",
    default_flow,
    icon_url,
    is_visible = true,
    is_premium = false,
  } = body;

  if (!name || !default_prompt) {
    return NextResponse.json(
      { error: "Name and default_prompt are required" },
      { status: 400 }
    );
  }

  const validTypes = ["VOICE", "CHAT", "BOTH"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const validCategories = ["SALES", "SUPPORT", "SURVEY", "COLLECTION", "GENERAL"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data: template, error } = await supabaseAdmin.from("agent_templates")
    .insert({
      name,
      description: description || null,
      type,
      category,
      default_prompt,
      default_voice,
      default_language,
      default_tone,
      default_flow: default_flow || { nodes: [], edges: [] },
      icon_url: icon_url || null,
      is_visible,
      is_premium,
      created_by: decoded.userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Template created successfully", template },
    { status: 201 }
  );
}
