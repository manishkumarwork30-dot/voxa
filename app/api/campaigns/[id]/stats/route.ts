import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header missing or invalid" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string; adminId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { id } = await params;
    const adminId = decoded.role === "USER" ? decoded.adminId : decoded.userId;

    // Fetch campaign
    let query = supabase.from("campaigns").select("*, agents(name, language)").eq("id", id);
    if (decoded.role !== "SUPER_ADMIN") {
      query = query.eq("admin_id", adminId!);
    }
    const { data: campaign, error: campErr } = await query.single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Fetch associated calls
    const { data: calls, error: callsErr } = await supabase
      .from("calls")
      .select(`
        id,
        vapi_call_id,
        phone_number: caller_number,
        status,
        duration_sec,
        transcript,
        recording_url,
        cost_usd,
        created_at,
        leads(id, customer_name, email, intent_score, status)
      `)
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });

    if (callsErr) {
      console.error("Failed to fetch calls for campaign stats:", callsErr);
      return NextResponse.json({ error: "Failed to fetch associated calls" }, { status: 500 });
    }

    // Process statistics
    const totalContacts = Array.isArray(campaign.contacts) ? campaign.contacts.length : 0;
    const completedCalls = calls?.filter(c => c.status === "COMPLETED").length || 0;
    const failedCalls = calls?.filter(c => c.status === "FAILED").length || 0;
    const noAnswerCalls = calls?.filter(c => c.status === "NO_ANSWER").length || 0;
    const initiatedCalls = calls?.filter(c => c.status === "INITIATED" || c.status === "RINGING" || c.status === "IN_PROGRESS").length || 0;
    
    // We treat COMPLETED calls as successful contacts
    const successfulCalls = completedCalls;

    // Format calls payload to match live monitoring frontend expectations
    const formattedCalls = (calls || []).map((c: any) => ({
      id: c.id,
      vapi_call_id: c.vapi_call_id,
      phone_number: c.phone_number,
      status: c.status?.toLowerCase() || "initiated",
      duration_sec: c.duration_sec,
      transcript: c.transcript,
      recording_url: c.recording_url,
      cost_usd: c.cost_usd,
      created_at: c.created_at,
      collected_data: c.leads?.[0] ? {
        interested: c.leads[0].status !== "REJECTED",
        name: c.leads[0].customer_name,
        email: c.leads[0].email,
        intent_score: c.leads[0].intent_score
      } : null
    }));

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        total_contacts: totalContacts,
        calls_completed: completedCalls,
        calls_failed: failedCalls,
        calls_successful: successfulCalls,
        no_answer: noAnswerCalls,
        initiated: initiatedCalls,
        status: campaign.status,
      },
      calls: formattedCalls
    }, { status: 200 });

  } catch (error) {
    console.error("Campaign stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
