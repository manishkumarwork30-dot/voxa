import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

// Amounts in INR paise (₹ * 100)
const PLAN_AMOUNTS: Record<string, number> = {
  PRO: 410000, // ₹4100
  ENTERPRISE: 1660000, // ₹16600
};

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json();
    const upperPlan = plan?.toUpperCase();
    if (!upperPlan || !(upperPlan in PLAN_AMOUNTS)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If keys are not set, simulate order creation
    if (!keyId || !keySecret) {
      return NextResponse.json({ isSimulated: true, plan: upperPlan }, { status: 200 });
    }

    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await instance.orders.create({
      amount: PLAN_AMOUNTS[upperPlan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      isSimulated: false,
    }, { status: 200 });
  } catch (err) {
    console.error("Razorpay order error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
