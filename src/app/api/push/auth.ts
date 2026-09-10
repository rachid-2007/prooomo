import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const authSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export async function requireUser(request: Request): Promise<AuthUser | null> {
  try {
    const token = request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];
    if (!token) return null;
    const { payload } = await jwtVerify(token, authSecret);
    if (!payload.id || !payload.role) return null;
    return {
      id: payload.id as string,
      username: (payload.username as string) || "",
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(request: Request): Promise<{ id: string } | null> {
  const user = await requireUser(request);
  if (!user || user.role !== "ADMIN") return null;
  return { id: user.id };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
