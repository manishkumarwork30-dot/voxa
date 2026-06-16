import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { getVapiClientForAdmin } from "@/lib/vapi";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET) as {
      role?: string; userId?: string;
    };
  } catch { return null; }
}

// POST /api/campaigns/[id]/start — start bulk dialing campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const adminId = decoded.userId!;
  const { id } = await params;

  // Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("*, agents(vapi_agent_id, status)")
    .eq("id", id)
    .eq("admin_id", adminId)
    .single();


  if (campErr || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "RUNNING") return NextResponse.json({ error: "Campaign is already running" }, { status: 400 });
  if (campaign.status === "COMPLETED") return NextResponse.json({ error: "Campaign is already completed" }, { status: 400 });

  const contacts: { phone: string; name?: string }[] = campaign.contacts || [];
  if (contacts.length === 0) return NextResponse.json({ error: "No contacts in campaign" }, { status: 400 });

  const agent = campaign.agents as any;
  if (!agent || agent.status !== "ACTIVE") return NextResponse.json({ error: "Agent is not active" }, { status: 400 });

  // Fetch admin for call limit check
  const { data: admin } = await supabase
    .from("users")
    .select("monthly_calls_limit, monthly_calls_used, vapi_phone_number, retell_phone_number, bland_phone_number, telnyx_phone_number, vapi_api_key, retell_api_key, bland_api_key, telnyx_api_key, is_active")
    .eq("id", adminId)
    .single();
  if (!admin?.is_active) return NextResponse.json({ error: "Admin inactive" }, { status: 403 });

  const automation = campaign.automation_settings as {
    retry_count?: number;
    delay_between_calls?: number;
    retry_delay?: number;
  } || { retry_count: 2, delay_between_calls: 30, retry_delay: 300 };

  const delayMs = (automation.delay_between_calls || 30) * 1000;
  const startIndex = campaign.current_index || 0;
  const remainingContacts = contacts.slice(startIndex);

  // Mark campaign as RUNNING
  await supabase
    .from("campaigns")
    .update({ status: "RUNNING", current_index: startIndex })
    .eq("id", id);

  // Return immediately — dialing runs in background via async IIFE
  const response = NextResponse.json({
    message: "Campaign started",
    total_contacts: contacts.length,
    remaining: remainingContacts.length,
    delay_between_calls_sec: automation.delay_between_calls || 30,
  });

  // Background sequential dialing
  (async () => {
    let callsMade = 0;

    for (let i = 0; i < remainingContacts.length; i++) {
      // Check if campaign was paused/stopped
      const { data: currentCampaign } = await supabase
        .from("campaigns").select("status").eq("id", id).single();
      if (currentCampaign?.status !== "RUNNING") break;

      // Check call limits
      const { data: freshAdmin } = await supabase
        .from("users")
        .select("monthly_calls_limit, monthly_calls_used, vapi_phone_number, retell_phone_number, bland_phone_number, telnyx_phone_number, vapi_api_key, retell_api_key, bland_api_key, telnyx_api_key")
        .eq("id", adminId)
        .single();
      if (!freshAdmin) break;
      if ((freshAdmin.monthly_calls_used || 0) >= (freshAdmin.monthly_calls_limit || 100)) break;

      const contact = remainingContacts[i];
      const phoneNumber = typeof contact === "string" ? contact : contact.phone;
      const contactName = typeof contact === "object" ? contact.name : undefined;

      // Dial using provider or simulate
      const hasTelephonyKey = admin.vapi_api_key || admin.retell_api_key || admin.bland_api_key || admin.telnyx_api_key;
      const isMock = !hasTelephonyKey || campaign.caller_number_type === "SIMULATE";

      if (isMock) {
        // Sandbox mode
        await supabase.from("calls").insert({
          vapi_call_id: `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          admin_id: adminId,
          agent_id: campaign.agent_id,
          campaign_id: id,
          direction: "OUTBOUND",
          caller_number: phoneNumber,
          status: "COMPLETED",
          duration_sec: Math.floor(Math.random() * 90) + 30,
          transcript: `Simulated call to ${phoneNumber}. Agent delivered campaign message.`,
          cost_usd: 0,
        });
      } else {
        try {
          const { getTelephonyClientForAgent } = await import("@/lib/telephony");
          const { client: telephonyClient, remoteId, provider } = await getTelephonyClientForAgent(adminId, agent.vapi_agent_id);

          let phoneNumberId = freshAdmin.vapi_phone_number || campaign.custom_caller_id || "";
          if (provider === 'RETELL') {
            phoneNumberId = freshAdmin.retell_phone_number || campaign.custom_caller_id || "";
          } else if (provider === 'BLAND_AI') {
            phoneNumberId = freshAdmin.bland_phone_number || campaign.custom_caller_id || "";
          } else if (provider === 'TELNYX') {
            phoneNumberId = freshAdmin.telnyx_phone_number || campaign.custom_caller_id || "";
          }

          const callResult = await telephonyClient.makeOutboundCall({
            phoneNumber,
            assistantId: remoteId,
            phoneNumberId,
            customerName: contactName,
          });

          await supabase.from("calls").insert({
            vapi_call_id: callResult.id || `call_${Date.now()}`,
            admin_id: adminId,
            agent_id: campaign.agent_id,
            campaign_id: id,
            direction: "OUTBOUND",
            caller_number: phoneNumber,
            status: "INITIATED",
          });
        } catch (err) {
          console.error(`Failed to call ${phoneNumber}:`, err);
        }
      }

      // Increment counts
      callsMade++;
      await supabase
        .from("users")
        .update({ monthly_calls_used: (freshAdmin.monthly_calls_used || 0) + 1 })
        .eq("id", adminId);

      await supabase
        .from("campaigns")
        .update({
          total_calls: campaign.total_calls + callsMade,
          current_index: startIndex + i + 1,
        })
        .eq("id", id);

      // Delay between calls
      if (i < remainingContacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Mark campaign as COMPLETED if all contacts dialed
    const { data: c } = await supabase.from("campaigns").select("status, current_index").eq("id", id).single();
    if (c?.status === "RUNNING") {
      const isComplete = (c.current_index || 0) >= contacts.length;
      await supabase.from("campaigns").update({ status: isComplete ? "COMPLETED" : "PAUSED" }).eq("id", id);
    }
  })().catch(console.error);

  return response;
}
