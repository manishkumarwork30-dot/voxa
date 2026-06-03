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
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GET /api/agent-templates/[id]
// ─────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: template, error } = await supabase
    .from("agent_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Non-super-admins can only see visible templates
  if (decoded.role !== "SUPER_ADMIN" && !template.is_visible) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

// ─────────────────────────────────────────────
// PATCH /api/agent-templates/[id]
// Super Admin only
// ─────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can update templates" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Build updates object only from provided fields
  const allowedFields = [
    "name", "description", "type", "category",
    "default_prompt", "default_voice", "default_language", "default_tone",
    "default_flow", "icon_url", "is_visible", "is_premium",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data: template, error } = await supabase
    .from("agent_templates")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }

  return NextResponse.json({ message: "Template updated", template });
}

// ─────────────────────────────────────────────
// DELETE /api/agent-templates/[id]
// Super Admin only
// ─────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can delete templates" }, { status: 403 });
  }

  const { id } = await params;

  // Check if any agents reference this template
  const { count } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id)
    .neq("status", "DELETED");

  if ((count ?? 0) > 0) {
    // Soft-hide instead of deleting
    await supabase
      .from("agent_templates")
      .update({ is_visible: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({
      message: "Template hidden (has active agents using it). Set is_visible=false.",
    });
  }

  const { error } = await supabase
    .from("agent_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }

  return NextResponse.json({ message: "Template deleted" });
}
