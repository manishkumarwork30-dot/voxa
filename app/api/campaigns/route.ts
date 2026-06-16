import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function GET(request: NextRequest) {
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

    // Allow ADMIN, USER, and SUPER_ADMIN
    if (decoded.role !== "ADMIN" && decoded.role !== "USER" && decoded.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let query = supabaseAdmin.from("campaigns").select("*").order("created_at", { ascending: false });

    if (decoded.role !== "SUPER_ADMIN") {
      const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
      query = query.eq("admin_id", adminId!);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
    }

    return NextResponse.json(
      {
        campaigns: campaigns || [],
        count: campaigns?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get campaigns error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Only admins and super admins can create campaigns
    if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, agent_id, type, contacts, scheduled_at } = body;

    // Validation
    if (!name || !agent_id || !type || !contacts) {
      return NextResponse.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      );
    }

    // Validate call type
    const validTypes = ["INBOUND", "OUTBOUND"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid call type. Must be INBOUND or OUTBOUND" },
        { status: 400 }
      );
    }

    // Validate contacts
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "Contacts must be a non-empty array of phone numbers" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to this admin
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agent_id)
      .eq("admin_id", decoded.userId!)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found or does not belong to this admin" },
        { status: 404 }
      );
    }

    // Check if admin exists and is active
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("users")
      .select("id, is_active, plan")
      .eq("id", decoded.userId!)
      .single();

    if (adminError || !admin || !admin.is_active) {
      return NextResponse.json(
        { error: "Admin not found or inactive" },
        { status: 404 }
      );
    }

    // SaaS Campaign Contacts Limit Check
    let maxContacts = 50;
    if (admin.plan === "PRO") {
      maxContacts = 1000;
    } else if (admin.plan === "ENTERPRISE") {
      maxContacts = 100000;
    }

    if (contacts.length > maxContacts) {
      return NextResponse.json(
        { error: `Contact limit exceeded. Your current plan (${admin.plan}) allows a maximum of ${maxContacts} contacts per campaign. Please upgrade to increase this limit.` },
        { status: 403 }
      );
    }

    // Create campaign
    const { data: campaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        name,
        agent_id,
        type,
        contacts,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        admin_id: decoded.userId,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Campaign created successfully",
        campaign: {
          id: campaign.id,
          name: campaign.name,
          agent_id: campaign.agent_id,
          type: campaign.type,
          contacts: campaign.contacts,
          status: campaign.status,
          scheduled_at: campaign.scheduled_at,
          created_at: campaign.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}