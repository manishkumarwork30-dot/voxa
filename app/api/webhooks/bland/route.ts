import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { detectIntent } from "@/lib/intent";
import { sendLeadNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Bland AI Webhook payload:", JSON.stringify(body));

    const {
      call_id,
      event,
      transcript,
      recording_url,
      status: rawStatus,
      duration,
      cost,
      corrected_duration
    } = body;

    if (!call_id) {
      return NextResponse.json({ error: "Missing call_id" }, { status: 400 });
    }

    // Find the call in database
    const { data: callRecord, error: findError } = await supabase
      .from("calls")
      .select("*")
      .eq("vapi_call_id", call_id)
      .single();

    if (findError || !callRecord) {
      console.warn(`[Bland Webhook] Call record not found for call_id: ${call_id}`);
      return NextResponse.json({ received: true });
    }

    // Map Bland AI status to Vaxo status
    // Bland status: "completed" | "failed" | "no-answer" | "busy" | "ringing" | "in-progress"
    let status = "COMPLETED";
    if (rawStatus === "failed") {
      status = "FAILED";
    } else if (rawStatus === "no-answer" || rawStatus === "busy" || rawStatus === "voicemail") {
      status = "NO_ANSWER";
    } else if (rawStatus === "ringing") {
      status = "RINGING";
    } else if (rawStatus === "in-progress") {
      status = "IN_PROGRESS";
    }

    const durationSec = corrected_duration || duration || 0;
    const finalTranscript = transcript || callRecord.transcript || null;
    const finalRecording = recording_url || callRecord.recording_url || null;
    const costUsd = cost || null;

    // Update call details in DB
    const { error: updateError } = await supabase
      .from("calls")
      .update({
        status,
        duration_sec: Math.round(durationSec),
        transcript: finalTranscript,
        recording_url: finalRecording,
        cost_usd: costUsd,
        ended_at: new Date().toISOString(),
      })
      .eq("id", callRecord.id);

    if (updateError) {
      console.error("[Bland Webhook] Failed to update call details:", updateError);
    }

    // Lead detection from transcript
    if (finalTranscript && status === "COMPLETED") {
      const intent = detectIntent(finalTranscript);

      if (intent.isLead) {
        // Check if lead already exists for this call to prevent duplicates
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("call_id", callRecord.id)
          .maybeSingle();

        if (!existingLead) {
          let campaignName: string | undefined;

          if (callRecord.campaign_id) {
            // Fetch campaign name
            const { data: camp } = await supabase
              .from("campaigns")
              .select("name, success_count")
              .eq("id", callRecord.campaign_id)
              .single();

            campaignName = camp?.name;

            // Increment campaign success_count
            const currentSuccessCount = camp?.success_count || 0;
            await supabase
              .from("campaigns")
              .update({ success_count: currentSuccessCount + 1 })
              .eq("id", callRecord.campaign_id);
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
              response_text: finalTranscript.slice(0, 1000),
              intent_score: intent.score,
              status: "NEW",
            })
            .select("id")
            .single();

          if (!leadErr && lead) {
            // Dispatch notifications to Admin
            await sendLeadNotification(callRecord.admin_id, {
              customerName: intent.customerName || callRecord.caller_number,
              phone: callRecord.caller_number,
              email: intent.email,
              campaignName,
              intentScore: intent.score,
              timestamp: new Date().toISOString(),
            }).catch(console.error);
          } else {
            console.error("[Bland Webhook] Failed to create lead:", leadErr);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Bland Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
