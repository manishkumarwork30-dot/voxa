import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
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

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, isSimulated } = await request.json();

    // If simulated flow, skip signature verification
    if (isSimulated) {
      return upgradeUserPlan(decoded, plan);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 });
    }
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }
    // Signature valid, upgrade plan
    return upgradeUserPlan(decoded, plan);
  } catch (err) {
    console.error("Razorpay verification error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function upgradeUserPlan(decoded: { userId?: string }, plan: string) {
  const upperPlan = plan?.toUpperCase();
  const validPlans = ["STARTER", "PRO", "ENTERPRISE"];
  if (!upperPlan || !validPlans.includes(upperPlan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const userId = decoded.userId;

  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId!)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let callsLimit = 100;
  if (upperPlan === "PRO") callsLimit = 1000;
  else if (upperPlan === "ENTERPRISE") callsLimit = 10000;

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      plan: upperPlan,
      monthly_calls_limit: callsLimit,
      monthly_calls_used: 0,
      subscription_status: upperPlan === "STARTER" ? "TRIAL" : "ACTIVE",
      billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", userId!);

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return NextResponse.json({ error: "Failed to upgrade plan" }, { status: 500 });
  }

  return NextResponse.json({ message: `Plan upgraded to ${upperPlan}` }, { status: 200 });
}
