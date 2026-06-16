/* eslint-disable */
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
  } catch { return null; }
}

// GET /api/leads — list leads (with optional CSV export)
export async function GET(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;
  const { searchParams } = new URL(request.url);
  const exportCsv = searchParams.get("export") === "csv";
  const campaignId = searchParams.get("campaign_id");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  let query = supabase
    .from("leads")
    .select("*, campaigns(name), calls(direction, duration_sec)")
    .order("created_at", { ascending: false });

  if (decoded.role !== "SUPER_ADMIN") {
    query = query.eq("admin_id", adminId!);
  }
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status) query = query.eq("status", status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  if (!exportCsv) {
    query = query.range((page - 1) * limit, page * limit - 1);
  }

  const { data: leads, error, count } = await query;
  if (error) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

  // CSV export
  if (exportCsv && leads) {
    const rows = [
      ["ID", "Name", "Phone", "Email", "Campaign", "Intent Score", "Status", "Created At"].join(","),
      ...(leads || []).map(l =>
        [
          l.id,
          `"${l.customer_name}"`,
          l.phone,
          l.email || "",
          `"${(l as any).campaigns?.name || ""}"`,
          l.intent_score,
          l.status,
          new Date(l.created_at).toLocaleString("en-IN"),
        ].join(",")
      ),
    ].join("\n");

    return new Response(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads_${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ leads: leads || [], count: count || leads?.length || 0 });
}

// POST /api/leads — manually create a lead
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await request.json();
  const { customer_name, phone, email, campaign_id, call_id, response_text } = body;
  if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      admin_id: decoded.userId,
      campaign_id: campaign_id || null,
      call_id: call_id || null,
      customer_name: customer_name || "Manual Lead",
      phone,
      email: email || null,
      response_text: response_text || null,
      intent_score: 1.0,
      status: "NEW",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  return NextResponse.json({ message: "Lead created", lead }, { status: 201 });
}

