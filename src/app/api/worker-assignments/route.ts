import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";

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

// Get assigned products for a worker
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const workerId = url.searchParams.get("workerId");

    if (!workerId) {
      return NextResponse.json({ error: "workerId required" }, { status: 400 });
    }

    const assigned = await prisma.workerProduct.findMany({
      where: { workerId },
      include: { product: { select: { id: true, name: true, price: true } } },
    });

    return NextResponse.json(assigned.map((a) => a.product));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Assign/unassign products to worker
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workerId, productIds } = await request.json();

    if (!workerId || !Array.isArray(productIds)) {
      return NextResponse.json({ error: "workerId and productIds required" }, { status: 400 });
    }

    // Remove existing assignments
    await prisma.workerProduct.deleteMany({ where: { workerId } });

    // Add new assignments
    if (productIds.length > 0) {
      await prisma.workerProduct.createMany({
        data: productIds.map((productId: string) => ({ workerId, productId })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
