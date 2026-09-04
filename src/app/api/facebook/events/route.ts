import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const eventName = searchParams.get("event");

    const where: any = {};
    if (status) where.status = status;
    if (eventName) where.eventName = eventName;

    const [events, total, stats] = await Promise.all([
      prisma.facebookEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.facebookEvent.count({ where }),
      prisma.facebookEvent.groupBy({
        by: ["eventName", "status"],
        _count: true,
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return NextResponse.json({ events, total, stats });
  } catch {
    return NextResponse.json({ events: [], total: 0, stats: [] });
  }
}
