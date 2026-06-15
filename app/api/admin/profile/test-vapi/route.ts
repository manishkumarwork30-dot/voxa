import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { TelephonyClient } from "@/lib/telephony";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.replace("Bearer ", ""), JWT_SECRET) as {
      role?: string; userId?: string;
    };
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const decoded = getAuth(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (decoded.role !== "ADMIN" && decoded.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { provider = 'VAPI', api_key } = await request.json();
  if (!api_key) return NextResponse.json({ error: "API key required" }, { status: 400 });

  try {
    const client = new TelephonyClient(provider, api_key);
    const result = await client.testConnection();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: err.message });
  }
}
