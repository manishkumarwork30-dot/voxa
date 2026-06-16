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
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string; adminId?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    let query = supabaseAdmin.from("calls").select("*").order("created_at", { ascending: false });

    // Super admins can see all calls
    if (decoded.role === "SUPER_ADMIN") {
      // no filter
    } else if (decoded.role === "ADMIN") {
      query = query.eq("admin_id", decoded.userId!);
    } else if (decoded.role === "USER") {
      const adminId = decoded.adminId || decoded.userId;
      query = query.eq("admin_id", adminId!);
    } else {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
    }

    return NextResponse.json(
      {
        calls: calls || [],
        count: calls?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get calls error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}