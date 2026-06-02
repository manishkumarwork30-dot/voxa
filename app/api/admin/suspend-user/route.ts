import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

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

    // Allow SUPER_ADMIN and ADMIN roles
    if (decoded.role !== "SUPER_ADMIN" && decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action required" }, { status: 400 });
    }

    // Fetch the target user
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent suspending another super admin
    if (decoded.role === "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot suspend another super admin" }, { status: 403 });
    }

    // Admins can only suspend/activate their own sub-users (USER role)
    if (decoded.role === "ADMIN" && (user.role !== "USER" || user.created_by !== decoded.userId)) {
      return NextResponse.json({ error: "You can only modify your own sub-users" }, { status: 403 });
    }

    let newActiveState: boolean;
    if (action === "suspend") {
      newActiveState = false;
    } else if (action === "activate") {
      newActiveState = true;
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'suspend' or 'activate'" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ is_active: newActiveState })
      .eq("id", userId)
      .select("id, name, email, role, is_active")
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({
      message: `User ${action}ed successfully`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        is_active: updated.is_active,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Suspend user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
