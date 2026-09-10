import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const authSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

// Pages restricted to admins (workers get redirected to their own page)
const ADMIN_PATHS = ["/users", "/accounts", "/settings"];

async function getRole(request: NextRequest): Promise<{ role: string; username: string } | null> {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, authSecret);
    if (!payload.role) return null;
    return { role: payload.role as string, username: (payload.username as string) || "" };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public pages
  const publicPaths = ["/login"];
  if (publicPaths.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Allow store and product pages (public-facing)
  if (pathname.startsWith("/store/") || pathname === "/store" || pathname.startsWith("/product/")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("auth-token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin-only pages: workers are redirected to their own workspace
  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const session = await getRole(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== "ADMIN") {
      const target = session.username ? `/worker/${session.username}` : "/login";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
