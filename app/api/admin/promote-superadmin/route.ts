// app/api/admin/promote-superadmin/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.split(" ");
    if (!authHeader || authHeader[0] !== "Bearer") {
      return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });
    }
    const token = authHeader[1];

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ role: "SUPER_ADMIN" })
      .eq("email", email)
      .select("id, name, email, role");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "User promoted to super admin", updated: data }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
