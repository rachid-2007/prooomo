import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const authSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

export async function requireAdmin(request: Request): Promise<{ id: string } | null> {
  try {
    const token = request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];
    if (!token) return null;
    const { payload } = await jwtVerify(token, authSecret);
    if (payload.role !== "ADMIN") return null;
    return { id: (payload.id as string) || "" };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
