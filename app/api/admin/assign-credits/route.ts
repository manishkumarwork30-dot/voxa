import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (decoded.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, creditsToAdd } = body;

    if (!userId || !creditsToAdd) {
      return NextResponse.json(
        { error: "User ID and credits to add are required" },
        { status: 400 }
      );
    }

    // First fetch current user's balance
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('wallet_balance, name')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      // If wallet_balance doesn't exist yet because SQL wasn't run, handle gracefully
      if (fetchError?.message?.includes('column "wallet_balance" does not exist')) {
        return NextResponse.json(
          { error: "Database not ready. Please run the SQL command to add 'wallet_balance' column." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = parseFloat(user.wallet_balance || 0);
    const newBalance = currentBalance + parseFloat(creditsToAdd);

    // Update the balance
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully added ${creditsToAdd} credits to ${user.name}`,
      newBalance: newBalance
    });

  } catch (error: any) {
    console.error("Assign credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
