import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt } from "@/lib/encrypt";
import { TelephonyClient } from "@/lib/telephony";

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

// PATCH /api/admin/profile — update provider configurations + notification settings
export async function PATCH(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await request.json();
  const {
    telephony_provider,
    vapi_api_key,
    vapi_phone_number,
    retell_api_key,
    retell_phone_number,
    bland_api_key,
    bland_phone_number,
    telnyx_api_key,
    telnyx_phone_number,
    notification_settings
  } = body;

  const updates: Record<string, any> = {};

  if (telephony_provider !== undefined) {
    updates.telephony_provider = telephony_provider || 'VAPI';
  }

  // Encrypt Vapi key
  if (vapi_api_key !== undefined) {
    if (vapi_api_key) {
      try {
        updates.vapi_api_key = encrypt(vapi_api_key);
      } catch {
        updates.vapi_api_key = vapi_api_key;
      }
    } else {
      updates.vapi_api_key = null;
    }
  }

  if (vapi_phone_number !== undefined) {
    updates.vapi_phone_number = vapi_phone_number || null;
  }

  // Encrypt Retell key
  if (retell_api_key !== undefined) {
    if (retell_api_key) {
      try {
        updates.retell_api_key = encrypt(retell_api_key);
      } catch {
        updates.retell_api_key = retell_api_key;
      }
    } else {
      updates.retell_api_key = null;
    }
  }

  if (retell_phone_number !== undefined) {
    updates.retell_phone_number = retell_phone_number || null;
  }

  // Encrypt Bland AI key
  if (bland_api_key !== undefined) {
    if (bland_api_key) {
      try {
        updates.bland_api_key = encrypt(bland_api_key);
      } catch {
        updates.bland_api_key = bland_api_key;
      }
    } else {
      updates.bland_api_key = null;
    }
  }

  if (bland_phone_number !== undefined) {
    updates.bland_phone_number = bland_phone_number || null;
  }

  // Encrypt Telnyx key
  if (telnyx_api_key !== undefined) {
    if (telnyx_api_key) {
      try {
        updates.telnyx_api_key = encrypt(telnyx_api_key);
      } catch {
        updates.telnyx_api_key = telnyx_api_key;
      }
    } else {
      updates.telnyx_api_key = null;
    }
  }

  if (telnyx_phone_number !== undefined) {
    updates.telnyx_phone_number = telnyx_phone_number || null;
  }

  if (notification_settings !== undefined) {
    updates.notification_settings = notification_settings;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", decoded.userId!)
    .select("id, name, email, telephony_provider, vapi_phone_number, retell_phone_number, bland_phone_number, telnyx_phone_number, notification_settings")
    .single();

  if (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ message: "Settings saved successfully", user });
}

