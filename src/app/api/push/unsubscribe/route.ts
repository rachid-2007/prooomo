import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../auth";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  try {
    const body = await request.json();
    const { endpoint } = body || {};
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    const total = await prisma.pushSubscription.count();
    return NextResponse.json({ success: true, total });
  } catch {
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
