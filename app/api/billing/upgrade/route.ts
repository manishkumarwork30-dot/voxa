import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { plan, targetUserId, paymentId } = body;

    const upperPlan = plan?.toUpperCase();
    const validPlans = ["STARTER", "PRO", "ENTERPRISE"];
    if (!upperPlan || !validPlans.includes(upperPlan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be STARTER, PRO, or ENTERPRISE" },
        { status: 400 }
      );
    }

    // Determine target user
    let userIdToUpdate = decoded.userId;

    if (decoded.role === "SUPER_ADMIN") {
      if (!targetUserId) {
        return NextResponse.json(
          { error: "targetUserId is required for super admin modifications" },
          { status: 400 }
        );
      }
      userIdToUpdate = targetUserId;
    } else if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins can modify billing plans." },
        { status: 403 }
      );
    }

    // Get user details
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userIdToUpdate!)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Set plan limits
    let callsLimit = 100;
    if (upperPlan === "PRO") {
      callsLimit = 1000;
    } else if (upperPlan === "ENTERPRISE") {
      callsLimit = 10000;
    }

    const updateFields: Record<string, unknown> = {
      plan: upperPlan,
      monthly_calls_limit: callsLimit,
      monthly_calls_used: 0,
      subscription_status: upperPlan === "STARTER" ? "TRIAL" : "ACTIVE",
      billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (paymentId) {
      updateFields.stripe_customer_id = paymentId;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateFields)
      .eq("id", userIdToUpdate!)
      .select("id, name, email, role, plan, monthly_calls_limit, monthly_calls_used, subscription_status")
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: `Plan successfully updated to ${upperPlan}`,
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          plan: updated.plan,
          monthly_calls_limit: updated.monthly_calls_limit,
          monthly_calls_used: updated.monthly_calls_used,
          subscription_status: updated.subscription_status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upgrade plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
