/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { detectIntent } from "@/lib/intent";
import { sendLeadNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // Multi-provider payload normalization
    let type: string = message?.type || body.type;
    let call = message?.call || body.call;

    // Retell AI format
    if (body.event) {
      if (body.event === "call_started") type = "call-started";
      if (body.event === "call_ended" || body.event === "call_analyzed") type = "end-of-call-report";
      call = {
        id: body.call_id || body.call?.call_id,
        phoneNumber: { number: body.call?.from_number || "" },
        customer: { number: body.call?.to_number || "" },
        transcript: body.transcript || body.call?.transcript,
        recordingUrl: body.call?.recording_url,
        duration: body.call?.duration_ms ? body.call.duration_ms / 1000 : 0,
        endedReason: body.call?.disconnection_reason === "customer_hangup" ? "customer-ended-call" : "assistant-ended-call",
        assistantId: body.call?.agent_id
      };
    }

    // Bland AI format
    if (body.status === "completed" || body.call_id) {
      if (!type) {
        type = body.status === "completed" ? "end-of-call-report" : "call-started";
      }
      let transcriptText = "";
      if (body.transcripts && Array.isArray(body.transcripts)) {
        transcriptText = body.transcripts.map((t: any) => `${t.user}: ${t.text}`).join("\n");
      } else {
        transcriptText = body.concatenated_transcript || "";
      }
      call = {
        id: body.call_id,
        phoneNumber: { number: body.from || "" },
        customer: { number: body.to || "" },
        transcript: transcriptText,
        recordingUrl: body.recording_url,
        duration: body.call_length || 0,
        endedReason: "customer-ended-call",
      };
    }

    if (!type) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // ─────────────────────────────────────────────
    // EVENT: call-started
    // ─────────────────────────────────────────────
    if (type === "call-started" && call?.id) {
      // Find which admin owns the called phone number
      const calledNumber = call.phoneNumber?.number || call.customer?.number || "";
      const callerNumber = call.customer?.number || call.phoneNumber?.number || "Unknown";
      const direction = call.type === "inboundPhoneCall" ? "INBOUND" : "OUTBOUND";

      // Try to find admin by VAPI phone number
      let adminId: string | null = null;
      let agentId: string | null = null;

      if (call.assistantId) {
        const { data: agent } = await supabase
          .from("agents")
          .select("id, admin_id")
          .eq("vapi_agent_id", call.assistantId)
          .single();
        if (agent) {
          agentId = agent.id;
          adminId = agent.admin_id;
        }
      }

      if (adminId && agentId) {
        // Create call record
        const { error } = await supabaseAdmin.from("calls").insert({
          vapi_call_id: call.id,
          admin_id: adminId,
          agent_id: agentId,
          direction,
          caller_number: callerNumber,
          status: "IN_PROGRESS",
        });

        if (error && !error.message.includes("duplicate")) {
          console.error("Failed to create call record:", error);
        }
      }
    }

    // ─────────────────────────────────────────────
    // EVENT: transcript-update
    // ─────────────────────────────────────────────
    if (type === "transcript" && call?.id) {
      const transcript = message?.transcript || call.transcript;
      if (transcript) {
        await supabase
          .from("calls")
          .update({ transcript })
          .eq("vapi_call_id", call.id);
      }
    }

    // ─────────────────────────────────────────────
    // EVENT: call-ended (end-of-call-report)
    // ─────────────────────────────────────────────
    if ((type === "end-of-call-report" || type === "call-ended") && call?.id) {
      const endedReason = call.endedReason || message?.endedReason || "";
      const status =
        endedReason === "customer-ended-call" || endedReason === "assistant-ended-call"
          ? "COMPLETED"
          : endedReason === "customer-did-not-answer"
          ? "NO_ANSWER"
          : "FAILED";

      const transcript = message?.transcript || call.transcript || null;
      const recordingUrl = message?.recordingUrl || call.recordingUrl || null;
      const duration = message?.durationSeconds || call.duration || 0;
      const cost = message?.cost || call.cost || null;

      // Update call record
      await supabase
        .from("calls")
        .update({
          status,
          duration_sec: Math.round(duration),
          transcript,
          recording_url: recordingUrl,
          cost_usd: cost,
          ended_at: new Date().toISOString(),
        })
        .eq("vapi_call_id", call.id);

      // ──────────────────────────────────────────
      // Lead detection from transcript
      // ──────────────────────────────────────────
      if (transcript && status === "COMPLETED") {
        const intent = detectIntent(transcript);

        if (intent.isLead) {
          // Fetch call record to get admin_id, agent_id, campaign_id
          const { data: callRecord } = await supabase
            .from("calls")
            .select("id, admin_id, campaign_id, caller_number")
            .eq("vapi_call_id", call.id)
            .single();

          if (callRecord) {
            // Fetch campaign name if present
            let campaignName: string | undefined;
            if (callRecord.campaign_id) {
              const { data: camp } = await supabase
                .from("campaigns")
                .select("name")
                .eq("id", callRecord.campaign_id)
                .single();
              campaignName = camp?.name;

              // Increment campaign success_count
              try {
                const { error: rpcErr } = await supabaseAdmin.rpc("increment_campaign_success", {
                  campaign_id_arg: callRecord.campaign_id,
                });
                if (rpcErr) throw rpcErr;
              } catch (e) {
                // RPC may not exist, do manual update
                const { data: currentCamp } = await supabaseAdmin.from("campaigns").select("success_count").eq("id", callRecord.campaign_id).single();
                if (currentCamp) {
                  await supabase
                    .from("campaigns")
                    .update({ success_count: (currentCamp.success_count || 0) + 1 })
                    .eq("id", callRecord.campaign_id);
                }
              }
            }

            // Create lead record
            const { data: lead, error: leadErr } = await supabase
              .from("leads")
              .insert({
                admin_id: callRecord.admin_id,
                campaign_id: callRecord.campaign_id || null,
                call_id: callRecord.id,
                customer_name: intent.customerName || "Unknown Caller",
                phone: callRecord.caller_number,
                email: intent.email || null,
                response_text: transcript.slice(0, 1000),
                intent_score: intent.score,
                status: "NEW",
              })
              .select("id")
              .single();

            if (!leadErr && lead) {
              // Send notifications
              await sendLeadNotification(callRecord.admin_id, {
                customerName: intent.customerName || callRecord.caller_number,
                phone: callRecord.caller_number,
                email: intent.email,
                campaignName,
                intentScore: intent.score,
                timestamp: new Date().toISOString(),
              }).catch(console.error);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("VAPI webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
