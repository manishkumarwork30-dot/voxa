import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/encrypt";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export async function POST(request: NextRequest) {
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
      decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super admin can create admin users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, vapi_api_key, vapi_phone_number } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      );
    }

    // Optional: Validate VAPI API key if provided
    if (vapi_api_key && (!vapi_api_key.trim() || vapi_api_key.length < 10)) {
      return NextResponse.json(
        { error: "Invalid VAPI API key format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt VAPI API key if provided
    const encryptedVapiApiKey = vapi_api_key ? encrypt(vapi_api_key) : null;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        name,
        email,
        password_hash: hashedPassword,
        role: "ADMIN",
        vapi_api_key: encryptedVapiApiKey,
        vapi_phone_number: vapi_phone_number || null,
      })
      .select("id, name, email, role")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create admin" },
        { status: 500 }
      );
    }

    const tokenResponse = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "Admin registered successfully",
        token: tokenResponse,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
