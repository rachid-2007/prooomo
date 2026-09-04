import { NextResponse } from "next/server";
import prisma from "@/lib/db";

function getDateRange(time: string, dateFrom?: string, dateTo?: string): { gte?: Date; lte?: Date } | undefined {
  const now = new Date();
  if (dateFrom || dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); range.lte = d; }
    return range;
  }
  switch (time) {
    case "today": {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return { gte: s, lte: e };
    }
    case "yesterday": {
      const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
      return { gte: s, lte: e };
    }
    case "7days": {
      const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0);
      return { gte: s, lte: now };
    }
    case "30days": {
      const s = new Date(now); s.setDate(s.getDate() - 30); s.setHours(0, 0, 0, 0);
      return { gte: s, lte: now };
    }
    default: return undefined;
  }
}

const IN_DELIVERY_STATUSES = ["IN_DELIVERY", "ON_HOLD"];
const DELIVERED_STATUSES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];
const RETURN_STATUSES = ["RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED", "CUSTOMER_REORDERED"];
const REVERT_STATUSES = ["CANCELLED", "FAKE", "NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3", "PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3", "OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3", "POSTPONED"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const time = searchParams.get("time") || "all";
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const product = searchParams.get("product") || undefined;
    const viewMode = searchParams.get("viewMode") || "all";

    const dateRange = getDateRange(time, dateFrom, dateTo);
    const orderWhere: Record<string, any> = {};
    if (dateRange) orderWhere.createdAt = dateRange;
    if (product) orderWhere.productId = product;

    const abandonedWhere: Record<string, any> = {};
    if (dateRange) abandonedWhere.createdAt = dateRange;
    if (product) abandonedWhere.productId = product;

    const showOrders = viewMode === "orders" || viewMode === "all";
    const showAbandoned = viewMode === "abandoned" || viewMode === "all";

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const [regResult, abdResult] = await Promise.all([
      showOrders ? Promise.all([
        prisma.order.findMany({ where: orderWhere, select: { id: true, status: true, productId: true, wilayaId: true, quantity: true } }),
        prisma.order.count({ where: { ...orderWhere, createdAt: { gte: today, lt: tomorrow } } }),
        prisma.order.count({ where: { ...orderWhere, createdAt: { gte: yesterday, lt: today } } }),
        prisma.order.groupBy({ by: ["productId"], _count: true, _sum: { quantity: true }, where: orderWhere, orderBy: { _count: { productId: "desc" } }, take: 5 }),
        prisma.order.groupBy({ by: ["wilayaId"], _count: true, where: orderWhere, orderBy: { _count: { wilayaId: "desc" } }, take: 3 }),
      ]) : Promise.resolve([[], 0, 0, [], []] as any),

      showAbandoned ? Promise.all([
        prisma.abandonedOrder.findMany({ where: abandonedWhere, select: { id: true, status: true, productId: true, quantity: true } }),
        prisma.abandonedOrder.count({ where: { ...abandonedWhere, createdAt: { gte: today, lt: tomorrow } } }),
        prisma.abandonedOrder.count({ where: { ...abandonedWhere, createdAt: { gte: yesterday, lt: today } } }),
        prisma.abandonedOrder.groupBy({ by: ["productId"], _count: true, _sum: { quantity: true }, where: abandonedWhere, orderBy: { _count: { productId: "desc" } }, take: 5 }),
      ]) : Promise.resolve([[], 0, 0, []] as any),
    ]);

    const [regAllOrders, regToday, regYesterday, regByProduct, regTopWilayas] = regResult as any;
    const [abdAllOrders, abdToday, abdYesterday, abdByProduct] = abdResult as any;

    const regTotal = regAllOrders.length;
    const abdTotal = abdAllOrders.length;
    const totalOrders = regTotal + abdTotal;

    // Confirmed from regular orders
    let confirmedOrders = 0;
    const confirmedIds = new Set<string>();
    const regStatusMap = new Map<string, string>();
    for (const o of regAllOrders) regStatusMap.set(o.id, o.status);

    for (const o of regAllOrders) {
      if (o.status === "CONFIRMED" || o.status === "SHIPPED" || IN_DELIVERY_STATUSES.includes(o.status) || DELIVERED_STATUSES.includes(o.status) || RETURN_STATUSES.includes(o.status)) {
        if (!REVERT_STATUSES.includes(o.status)) {
          confirmedIds.add(o.id);
          confirmedOrders++;
        }
      }
    }

    // Confirmed from abandoned orders - same logic as regular orders
    let abdConfirmed = 0;
    for (const o of abdAllOrders) {
      if (o.status === "CONFIRMED" || o.status === "SHIPPED" || IN_DELIVERY_STATUSES.includes(o.status) || DELIVERED_STATUSES.includes(o.status) || RETURN_STATUSES.includes(o.status)) {
        if (!REVERT_STATUSES.includes(o.status)) {
          abdConfirmed++;
        }
      }
    }

    const ALL_DELIVERY_STATUSES = [...IN_DELIVERY_STATUSES, ...DELIVERED_STATUSES, ...RETURN_STATUSES];
    const SHIPPED_CUMULATIVE_STATUSES = ["SHIPPED", ...IN_DELIVERY_STATUSES, ...DELIVERED_STATUSES, ...RETURN_STATUSES];

    const regInDelivery = regAllOrders.filter((o: any) => IN_DELIVERY_STATUSES.includes(o.status)).length;
    const regDelivered = regAllOrders.filter((o: any) => DELIVERED_STATUSES.includes(o.status)).length;
    const regReturned = regAllOrders.filter((o: any) => RETURN_STATUSES.includes(o.status)).length;
    const regShipped = regAllOrders.filter((o: any) => SHIPPED_CUMULATIVE_STATUSES.includes(o.status)).length;
    const abdInDelivery = abdAllOrders.filter((o: any) => IN_DELIVERY_STATUSES.includes(o.status)).length;
    const abdDelivered = abdAllOrders.filter((o: any) => DELIVERED_STATUSES.includes(o.status)).length;
    const abdReturned = abdAllOrders.filter((o: any) => RETURN_STATUSES.includes(o.status)).length;
    const abdShipped = abdAllOrders.filter((o: any) => SHIPPED_CUMULATIVE_STATUSES.includes(o.status)).length;

    const allConfirmed = confirmedOrders + abdConfirmed;
    const allInDelivery = regInDelivery + abdInDelivery;
    const allDelivered = regDelivered + abdDelivered;
    const allReturned = regReturned + abdReturned;
    const allShipped = regShipped + abdShipped;

    const confirmedPercentage = totalOrders > 0 ? Math.round((allConfirmed / totalOrders) * 100) : 0;
    const shippedPercentage = allConfirmed > 0 ? Math.round((allShipped / allConfirmed) * 100) : 0;
    const inDeliveryPercentage = allShipped > 0 ? Math.round((allInDelivery / allShipped) * 100) : 0;
    const deliveredPercentage = allShipped > 0 ? Math.round((allDelivered / allShipped) * 100) : 0;
    const returnedPercentage = allShipped > 0 ? Math.round((allReturned / allShipped) * 100) : 0;

    let todayChange = 0;
    let todayDirection: "up" | "down" | "same" = "same";
    const yesterdayOrders = regYesterday + abdYesterday;
    const todayOrders = regToday + abdToday;
    if (yesterdayOrders > 0) {
      const change = ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100;
      todayChange = Math.round(Math.abs(change));
      todayDirection = change > 0 ? "up" : change < 0 ? "down" : "same";
    }

    // Merge byProduct
    const productMap = new Map<string, { count: number; totalQuantity: number }>();
    for (const item of regByProduct) {
      productMap.set(item.productId, { count: item._count, totalQuantity: item._sum.quantity || item._count });
    }
    for (const item of abdByProduct) {
      const existing = productMap.get(item.productId);
      if (existing) { existing.count += item._count; existing.totalQuantity += item._sum.quantity || item._count; }
      else productMap.set(item.productId, { count: item._count, totalQuantity: item._sum.quantity || item._count });
    }

    const allProductIds = Array.from(productMap.keys());
    const productsData = allProductIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, name: true, images: true } })
      : [];

    const ordersByProduct = Array.from(productMap.entries())
      .map(([productId, data]) => {
        const prod = productsData.find((p) => p.id === productId);
        let image = "";
        if (prod?.images) {
          try { const parsed = typeof prod.images === "string" ? JSON.parse(prod.images) : prod.images; image = Array.isArray(parsed) ? parsed[0] : ""; } catch { image = ""; }
        }
        return { productName: prod?.name || "Unknown", image, count: data.count, totalQuantity: data.totalQuantity };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top wilayas
    const wilayaIds = regTopWilayas.map((item: any) => item.wilayaId);
    const wilayasData = wilayaIds.length > 0
      ? await prisma.wilaya.findMany({ where: { id: { in: wilayaIds } }, select: { id: true, name: true } })
      : [];
    const topWilayas = regTopWilayas.map((item: any, index: number) => {
      const w = wilayasData.find((wil) => wil.id === item.wilayaId);
      return { name: w?.name || "Unknown", count: item._count, rank: index + 1 };
    });

    return NextResponse.json({
      totalOrders, confirmed: allConfirmed, shipped: allShipped, inDelivery: allInDelivery, delivered: allDelivered, returned: allReturned,
      confirmedPercentage, shippedPercentage, inDeliveryPercentage, deliveredPercentage, returnedPercentage,
      todayOrders, yesterdayOrders, todayChange, todayDirection,
      ordersByProduct, topWilayas,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
