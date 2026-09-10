import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../../push/auth";

// GET /api/security/status - anti-bot protection overview (admin)
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const [paused, blocksCount] = await Promise.all([
    prisma.settings.findUnique({ where: { key: "orders_paused" } }),
    prisma.blockedEntry.count(),
  ]);

  return NextResponse.json({
    turnstileConfigured: !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    ordersPaused: paused?.value === "1",
    blocksCount,
  });
}

// POST /api/security/pause { paused: boolean } - emergency kill-switch (admin)
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  try {
    const body = await request.json();
    const value = body?.paused ? "1" : "0";
    const existing = await prisma.settings.findUnique({ where: { key: "orders_paused" } });
    if (existing) {
      await prisma.settings.update({ where: { key: "orders_paused" }, data: { value } });
    } else {
      await prisma.settings.create({ data: { key: "orders_paused", value, type: "boolean" } });
    }
    return NextResponse.json({ success: true, ordersPaused: value === "1" });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
