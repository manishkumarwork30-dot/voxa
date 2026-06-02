import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export default function proxy(request: NextRequest) {
  const token = 
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  const pathname = request.nextUrl.pathname;

  let decodedRole: string | undefined;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
      decodedRole = decoded.role?.toUpperCase();
    } catch {
      // Invalid token, treat as no token
    }
  }

  // Redirect root page or login page to dashboard if already logged in
  if ((pathname === "/" || pathname === "/login") && decodedRole) {
    if (decodedRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/super-admin", request.url));
    } else if (decodedRole === "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    } else if (decodedRole === "USER") {
      return NextResponse.redirect(new URL("/dashboard/user", request.url));
    }
  }

  // Allow access to login, signup, and API auth routes without authentication
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/api/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // If accessing dashboard without a valid token, redirect to login
  if (!decodedRole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role checks for dashboards
  if (pathname.startsWith("/dashboard/super-admin") && decodedRole !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && decodedRole !== "ADMIN" && decodedRole !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/dashboard/user") && decodedRole !== "USER" && decodedRole !== "ADMIN" && decodedRole !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};