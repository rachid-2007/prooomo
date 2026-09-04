import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
