import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";
import { encrypt } from "@/lib/encrypt";
import { VapiClient } from "@/lib/vapi";

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

// PATCH /api/admin/profile — update VAPI keys + notification settings
export async function PATCH(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await request.json();
  const { vapi_api_key, vapi_phone_number, notification_settings } = body;

  const updates: Record<string, any> = {};

  if (vapi_api_key !== undefined) {
    // Encrypt before saving (if key is non-empty)
    if (vapi_api_key) {
      try {
        updates.vapi_api_key = encrypt(vapi_api_key);
      } catch {
        // If encryption fails (bad key), store plaintext for now
        updates.vapi_api_key = vapi_api_key;
      }
    } else {
      updates.vapi_api_key = null;
    }
  }

  if (vapi_phone_number !== undefined) {
    updates.vapi_phone_number = vapi_phone_number || null;
  }

  if (notification_settings !== undefined) {
    updates.notification_settings = notification_settings;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", decoded.userId!)
    .select("id, name, email, vapi_phone_number, notification_settings")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });

  return NextResponse.json({ message: "Profile updated successfully", user });
}

// POST /api/admin/profile/test-vapi — test VAPI connection
export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { vapi_api_key } = await request.json();
  if (!vapi_api_key) return NextResponse.json({ error: "API key required" }, { status: 400 });

  try {
    const client = new VapiClient(vapi_api_key);
    const result = await client.testConnection();
    if (result.valid) {
      return NextResponse.json({ valid: true, message: "VAPI API key is valid! ✅" });
    } else {
      return NextResponse.json({ valid: false, message: "Invalid VAPI API key ❌" });
    }
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: err.message });
  }
}
