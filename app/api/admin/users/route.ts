import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function GET(request: NextRequest) {
  try {
    const token = 
      request.cookies.get("token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");
      
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token missing or invalid" },
        { status: 401 }
      );
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string };
      console.log("DEBUG /api/admin/users: decoded token payload:", decoded);
    } catch (err: any) {
      console.error("DEBUG /api/admin/users: JWT verify failed:", err.message);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check permissions
    if (decoded.role !== "SUPER_ADMIN" && decoded.role !== "ADMIN") {
      console.warn(`DEBUG /api/admin/users: 403 Forbidden because role is ${decoded.role}`);
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from("users")
      .select("id, name, email, role, is_active, last_login, created_by, created_at, plan, subscription_status, monthly_calls_limit, monthly_calls_used, vapi_phone_number, retell_phone_number, bland_phone_number, telnyx_phone_number, telephony_provider, vapi_api_key, retell_api_key, bland_api_key, telnyx_api_key, billing_cycle_end")
      .order("created_at", { ascending: false });

    // Super admins can see all users; admins only see their sub-users
    if (decoded.role === "ADMIN") {
      query = query.eq("created_by", decoded.userId!);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        users: users || [],
        count: users?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
