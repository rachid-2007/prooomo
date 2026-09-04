import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MANUAL_STATUSES = [
  "NEW", "CONFIRMED",
  "NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3",
  "PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3",
  "OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3",
  "WAITING_CALLBACK", "POSTPONED", "CANCELLED", "FAKE",
];

const RETURN_STATUSES = [
  "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED",
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const excludeOrderId = searchParams.get("excludeOrderId");

    if (!phone || phone.length < 5) {
      return NextResponse.json({ duplicates: [], returns: [] });
    }

    const phoneCondition = { customerPhone: phone };
    const excludeCondition = excludeOrderId ? { id: { not: excludeOrderId } } : {};

    const [manualOrders, returnOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          ...phoneCondition,
          ...excludeCondition,
          status: { in: MANUAL_STATUSES },
        },
        select: { id: true, orderNumber: true, status: true, customerName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          ...phoneCondition,
          ...excludeCondition,
          status: { in: RETURN_STATUSES },
        },
        select: { id: true, orderNumber: true, status: true, customerName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({ duplicates: manualOrders, returns: returnOrders });
  } catch (error) {
    return NextResponse.json({ duplicates: [], returns: [] });
  }
}
