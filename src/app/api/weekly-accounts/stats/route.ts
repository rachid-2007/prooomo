import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const IN_DELIVERY_STATUSES = ["IN_DELIVERY", "ON_HOLD"];
const DELIVERED_STATUSES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];
const RETURN_STATUSES = ["RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED", "CUSTOMER_REORDERED"];
const CONFIRMED_STATUSES = ["CONFIRMED", "SHIPPED", ...IN_DELIVERY_STATUSES, ...DELIVERED_STATUSES, ...RETURN_STATUSES];
const REVERT_STATUSES = ["CANCELLED", "FAKE", "NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3", "PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3", "OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3", "POSTPONED"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const productId = searchParams.get("productId");

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
    }

    const gte = new Date(dateFrom);
    const lte = new Date(dateTo);
    lte.setHours(23, 59, 59, 999);

    const orderWhere: any = { createdAt: { gte, lte } };
    if (productId) orderWhere.productId = productId;

    const allOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, status: true },
    });

    const abandonedWhere: any = { createdAt: { gte, lte } };
    if (productId) abandonedWhere.productId = productId;

    const allAbandoned = await prisma.abandonedOrder.findMany({
      where: abandonedWhere,
      select: { id: true, status: true },
    });

    const totalOrders = allOrders.length;

    let confirmedOrders = 0;
    let deliveredOrders = 0;
    let confirmedAbandoned = 0;

    for (const o of allOrders) {
      if (CONFIRMED_STATUSES.includes(o.status) && !REVERT_STATUSES.includes(o.status)) {
        confirmedOrders++;
      }
      if (DELIVERED_STATUSES.includes(o.status)) {
        deliveredOrders++;
      }
    }

    for (const o of allAbandoned) {
      if (o.status === "CONFIRMED") {
        confirmedAbandoned++;
      }
    }

    return NextResponse.json({
      totalOrders,
      confirmedOrders,
      confirmedAbandoned,
      deliveredOrders,
      deliveredConfirmed: deliveredOrders,
      deliveredAbandoned: 0,
    });
  } catch (error) {
    console.error("Error fetching weekly account stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
