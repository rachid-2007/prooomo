import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getPeriodRange(period: string, customMonth?: string): { start: Date; end: Date; days: number } {
  const now = new Date();

  if (period === "currentMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 19);
    if (now.getDate() < 19) {
      start.setMonth(start.getMonth() - 1);
    }
    const diffMs = now.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return { start, end: now, days };
  }

  if (period === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 19);
    const end = new Date(now.getFullYear(), now.getMonth(), 19);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return { start, end, days };
  }

  if (period === "customMonth" && customMonth) {
    const [y, m] = customMonth.split("-").map(Number);
    const start = new Date(y, m - 1, 19);
    const end = new Date(y, m, 19);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return { start, end, days };
  }

  // Default: last 7 days
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end: now, days: 7 };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "currentMonth";
    const customMonth = searchParams.get("customMonth") || undefined;
    const viewMode = searchParams.get("viewMode") || "all";
    const product = searchParams.get("product") || undefined;

    const { start: startDate, end: endDate, days: daysParam } = getPeriodRange(period, customMonth);

    const showOrders = viewMode === "orders" || viewMode === "all";
    const showAbandoned = viewMode === "abandoned" || viewMode === "all";

    const orderWhere: Record<string, any> = { createdAt: { gte: startDate, lte: endDate } };
    if (product) orderWhere.productId = product;

    const abdWhere: Record<string, any> = { createdAt: { gte: startDate, lte: endDate } };
    if (product) abdWhere.productId = product;

    // Get all orders created in this period
    const [allOrders, allAbandonedOrders] = await Promise.all([
      showOrders ? prisma.order.findMany({
        where: orderWhere,
        select: { id: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
      showAbandoned ? prisma.abandonedOrder.findMany({
        where: abdWhere,
        select: { id: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
    ]);

    // Get all status history for regular orders in this period
    const orderIds = allOrders.map((o) => o.id);
    const allHistory = orderIds.length > 0 ? await prisma.orderStatusHistory.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, newStatus: true, createdAt: true },
    }) : [];

    // Build a map: orderId -> set of statuses it ever had
    const orderStatusMap = new Map<string, Set<string>>();
    for (const h of allHistory) {
      if (!orderStatusMap.has(h.orderId)) orderStatusMap.set(h.orderId, new Set());
      orderStatusMap.get(h.orderId)!.add(h.newStatus);
    }

    // Also add the initial status from the order itself
    for (const order of allOrders) {
      if (!orderStatusMap.has(order.id)) orderStatusMap.set(order.id, new Set());
      orderStatusMap.get(order.id)!.add(order.status);
    }

    // Add abandoned order statuses (no history tracking)
    for (const ao of allAbandonedOrders) {
      if (!orderStatusMap.has(ao.id)) orderStatusMap.set(ao.id, new Set());
      orderStatusMap.get(ao.id)!.add(ao.status);
    }

    // Initialize day map
    const dayMap = new Map<string, {
      date: string;
      dayName: string;
      totalOrders: number;
      confirmed: number;
      inDelivery: number;
      delivered: number;
      paid: number;
      shipped: number;
      returnPending: number;
      returned: number;
    }>();

    for (let i = 0; i < daysParam; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dayMap.set(key, {
        date: key,
        dayName: DAY_NAMES[d.getDay()],
        totalOrders: 0,
        confirmed: 0,
        inDelivery: 0,
        delivered: 0,
        paid: 0,
        shipped: 0,
        returnPending: 0,
        returned: 0,
      });
    }

    const IN_DELIVERY_STATUSES = ["IN_DELIVERY", "ON_HOLD"];
    const DELIVERED_STATUSES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];
    const RETURN_PENDING_STATUSES = ["CUSTOMER_REORDERED", "RETURN_TRANSFER", "RETURN_READY"];
    const RETURN_COMPLETED_STATUSES = ["RETURN_COMPLETED"];
    const SHIPPED_STATUSES = ["SHIPPED"];
    const CONFIRMED_STATUSES = ["CONFIRMED"];
    const SHIPPED_CUMULATIVE_STATUSES = ["SHIPPED", ...IN_DELIVERY_STATUSES, ...DELIVERED_STATUSES, ...RETURN_PENDING_STATUSES, ...RETURN_COMPLETED_STATUSES];
    const CONFIRMED_CUMULATIVE_STATUSES = ["CONFIRMED", ...SHIPPED_CUMULATIVE_STATUSES];

    // Count orders per day - use current status (like dashboard)
    const processOrder = (order: { id: string; status: string; createdAt: Date }) => {
      const key = order.createdAt.toISOString().split("T")[0];
      const day = dayMap.get(key);
      if (!day) return;

      day.totalOrders++;

      const currentStatus = order.status;

      if (CONFIRMED_CUMULATIVE_STATUSES.includes(currentStatus)) day.confirmed++;
      if (SHIPPED_CUMULATIVE_STATUSES.includes(currentStatus)) day.shipped++;
      if (IN_DELIVERY_STATUSES.includes(currentStatus)) day.inDelivery++;
      if (DELIVERED_STATUSES.includes(currentStatus)) day.delivered++;
      if (currentStatus === "PAID") day.paid++;
      if (RETURN_PENDING_STATUSES.includes(currentStatus)) day.returnPending++;
      if (RETURN_COMPLETED_STATUSES.includes(currentStatus)) day.returned++;
    };

    for (const order of allOrders) processOrder(order);
    for (const order of allAbandonedOrders) processOrder(order as any);

    const result = Array.from(dayMap.values());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching completion data:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion data" },
      { status: 500 }
    );
  }
}
