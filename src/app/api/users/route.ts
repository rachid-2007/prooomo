import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

async function getAuthUser(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/auth-token=([^;]+)/);
  if (!tokenMatch) return null;

  try {
    const { payload } = await jwtVerify(tokenMatch[1], secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        phone: true,
        storeSlug: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, username, password, role, phone, storeSlug } = body;

    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { error: "Name, email, username, and password are required" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        role: role || "WORKER",
        phone,
        storeSlug: storeSlug || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        phone: true,
        storeSlug: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
