import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { decrypt } from "@/lib/encrypt";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned; // Default to India if 10 digits
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

function parseCSV(csvText: string): Array<{ phone: string; name?: string; email?: string }> {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  
  const phoneIndex = headers.findIndex((h) => h.includes("phone") || h === "number" || h === "mobile");
  const nameIndex = headers.findIndex((h) => h.includes("name") || h === "first name" || h === "full name");
  const emailIndex = headers.findIndex((h) => h.includes("email"));

  if (phoneIndex === -1) return [];

  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting, handles quotes simply
    const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());
    if (!values[phoneIndex]) continue;

    const phone = cleanPhoneNumber(values[phoneIndex]);
    if (phone.length < 7) continue; // Basic length check

    contacts.push({
      phone,
      name: nameIndex !== -1 && values[nameIndex] ? values[nameIndex] : "Customer",
      email: emailIndex !== -1 && values[emailIndex] ? values[emailIndex] : undefined,
    });
  }

  return contacts;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header missing or invalid" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const adminId = decoded.userId!;

    // Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const campaignName = formData.get("campaignName") as string | null;
    const script = formData.get("script") as string | null;
    const languageInput = formData.get("language") as string | null; // "hi" or "en"
    const voiceId = (formData.get("voiceId") as string | null) || "sarah";

    if (!file || !campaignName || !script || !languageInput) {
      return NextResponse.json({ error: "Missing required fields (file, campaignName, script, language)" }, { status: 400 });
    }

    // Parse CSV Content
    const csvText = await file.text();
    const contacts = parseCSV(csvText);

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found in CSV. Make sure you have a 'phone' column." }, { status: 400 });
    }

    const language = languageInput.toUpperCase() === "HI" ? "HINDI" : "ENGLISH";

    // 1. Create or Find Bland Agent for this Campaign
    // First fetch admin info to verify credentials
    const { data: admin } = await supabase
      .from("users")
      .select("is_active, bland_api_key, telephony_provider")
      .eq("id", adminId)
      .single();

    if (!admin || !admin.is_active) {
      return NextResponse.json({ error: "Admin account not active or not found" }, { status: 404 });
    }

    // Try to create the agent on Bland AI if api key is present
    let vapiAgentId = `placeholder_bland_${Date.now()}`;
    if (admin.bland_api_key) {
      try {
        let apiKey: string;
        try {
          apiKey = decrypt(admin.bland_api_key);
        } catch {
          apiKey = admin.bland_api_key;
        }

        const { TelephonyClient } = await import("@/lib/telephony");
        const client = new TelephonyClient("BLAND_AI", apiKey);
        const remoteAgent = await client.createAgent({
          name: `${campaignName} Agent`,
          systemPrompt: script,
          voiceId: voiceId,
          language: language === "HINDI" ? "hi" : "en",
        });

        if (remoteAgent?.id) {
          vapiAgentId = `BLAND_AI:${remoteAgent.id}`;
        }
      } catch (err) {
        console.error("Bland AI agent remote creation failed (using placeholder):", err);
      }
    }

    // Save Agent to database
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .insert({
        name: `${campaignName} Agent`,
        language,
        voice_model: voiceId,
        system_prompt: script,
        admin_id: adminId,
        vapi_agent_id: vapiAgentId,
        type: "VOICE",
      })
      .select("*")
      .single();

    if (agentErr || !agent) {
      console.error("Failed to create campaign agent in DB:", agentErr);
      return NextResponse.json({ error: "Failed to create agent in DB" }, { status: 500 });
    }

    // 2. Create the Outbound Campaign
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaigns")
      .insert({
        name: campaignName,
        admin_id: adminId,
        agent_id: agent.id,
        type: "OUTBOUND",
        contacts,
        status: "DRAFT",
        automation_settings: {
          retry_count: 2,
          delay_between_calls: 10,
          retry_delay: 300,
        },
      })
      .select("*")
      .single();

    if (campaignErr || !campaign) {
      console.error("Failed to create campaign in DB:", campaignErr);
      return NextResponse.json({ error: "Failed to create campaign in DB" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      contactsCount: contacts.length,
      message: "Campaign and Agent created successfully.",
    }, { status: 201 });
  } catch (error) {
    console.error("Bulk upload campaign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
