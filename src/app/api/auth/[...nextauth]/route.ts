import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

async function createToken(user: { id: string; name: string; email: string; username: string; role: string }) {
  return new SignJWT({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "session") {
    const token = request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];
    if (!token) {
      return NextResponse.json({ user: null });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        username: payload.username || "",
        role: payload.role,
      },
    });
  }

  if (action === "providers") {
    return NextResponse.json({ credentials: { id: "credentials", name: "Email/Password" } });
  }

  return NextResponse.json({ message: "Auth API" });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "signin") {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return NextResponse.json({ error: "Email and password required" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = await createToken({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      const response = NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
      });

      response.cookies.set("auth-token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (action === "signout") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
