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
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check permissions
    if (decoded.role !== "SUPER_ADMIN" && decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from("users")
      .select("id, name, email, role, is_active, last_login, created_by, created_at, plan, subscription_status, monthly_calls_limit, monthly_calls_used, vapi_phone_number, billing_cycle_end, wallet_balance")
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
