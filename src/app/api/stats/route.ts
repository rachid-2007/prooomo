import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function calcWorkingMinutes(start: Date, end: Date): number {
  let total = 0;
  const s = new Date(start);
  const e = new Date(end);
  while (s < e) {
    const sHour = s.getHours();
    if (sHour >= 21 || sHour < 9) {
      s.setHours(9, 0, 0, 0);
      if (s >= e) break;
      continue;
    }
    const dayEnd = new Date(s);
    dayEnd.setHours(20, 30, 0, 0);
    if (e <= dayEnd) {
      total += (e.getTime() - s.getTime()) / 60000;
      break;
    }
    total += (dayEnd.getTime() - s.getTime()) / 60000;
    s.setDate(s.getDate() + 1);
    s.setHours(9, 0, 0, 0);
  }
  return Math.round(total);
}

const DELIVERED_STATUSES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];
const RETURN_STATUSES = ["RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED"];

function getDateRange(time: string): Date | null {
  const now = new Date();
  switch (time) {
    case "today": { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }
    case "7days": { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "30days": { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "month": { return new Date(now.getFullYear(), now.getMonth(), 1); }
    default: return null;
  }
}

type OrderRow = {
  id: string; status: string; createdAt: Date;
  productPrice: number; shippingPrice: number; totalPrice: number;
  quantity: number; purchasePrice: number; wilayaId: string; productId: string;
  statusHistory: { newStatus: string; createdAt: Date; changedBy: string | null }[];
};

type AbandonedRow = {
  id: string; status: string; createdAt: Date;
  productPrice: number | null; shippingPrice: number | null; totalPrice: number | null; quantity: number;
};

function buildStats(orders: OrderRow[], abandonedOrders: AbandonedRow[], expenses: { amount: number }[], wilayaMap: Map<string, string>, productNameMap: Map<string, string>) {
  const totalOrders = orders.length;
  const totalAbandoned = abandonedOrders.length;

  const allStatuses: Record<string, number> = {};
  for (const o of orders) allStatuses[o.status] = (allStatuses[o.status] || 0) + 1;
  for (const o of abandonedOrders) allStatuses[o.status] = (allStatuses[o.status] || 0) + 1;

  const now = new Date();
  const month19 = 19;
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  let currentMonthStart: Date, lastMonthStart: Date, lastMonthEnd: Date;
  if (nowMonth === 0) {
    currentMonthStart = new Date(nowYear - 1, 11, month19);
    lastMonthStart = new Date(nowYear - 1, 10, month19);
    lastMonthEnd = new Date(nowYear, 0, month19);
  } else if (now.getDate() >= month19) {
    currentMonthStart = new Date(nowYear, nowMonth - 1, month19);
    lastMonthStart = new Date(nowYear, nowMonth - 2, month19);
    lastMonthEnd = new Date(nowYear, nowMonth - 1, month19);
  } else {
    currentMonthStart = new Date(nowYear, nowMonth - 2, month19);
    lastMonthStart = new Date(nowYear, nowMonth - 3, month19);
    lastMonthEnd = new Date(nowYear, nowMonth - 2, month19);
  }

  const currentMonthOrders = orders.filter((o) => o.createdAt >= currentMonthStart && o.createdAt < now);
  const lastMonthOrders = orders.filter((o) => o.createdAt >= lastMonthStart && o.createdAt < lastMonthEnd);

  const calcProfit = (list: OrderRow[]) =>
    list.filter((o) => DELIVERED_STATUSES.includes(o.status))
      .reduce((s, o) => s + ((o.productPrice - (o.purchasePrice || 0)) * o.quantity), 0);

  const currentMonthProfit = calcProfit(currentMonthOrders);
  const lastMonthProfit = calcProfit(lastMonthOrders);

  const delivered = orders.filter((o) => DELIVERED_STATUSES.includes(o.status));
  const returned = orders.filter((o) => RETURN_STATUSES.includes(o.status));
  const finishedOrders = delivered.length + returned.length;
  const deliveryRate = finishedOrders > 0 ? Math.round((delivered.length / finishedOrders) * 100) : 0;
  const returnRate = finishedOrders > 0 ? Math.round((returned.length / finishedOrders) * 100) : 0;

  const totalRevenue = delivered.reduce((s, o) => s + o.totalPrice, 0);
  const totalCost = delivered.reduce((s, o) => s + (o.purchasePrice || 0) * o.quantity, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalCost - totalExpenses;

  let totalWorkingMinutes = 0, ordersWithFirstChange = 0;
  for (const order of orders) {
    if (order.statusHistory.length === 0) continue;
    const firstChange = order.statusHistory.find(
      (h) => h.newStatus !== "NEW" && h.changedBy !== "delivery_company" && h.changedBy !== "auto_recovery"
    );
    if (!firstChange) continue;
    const minutes = calcWorkingMinutes(order.createdAt, firstChange.createdAt);
    if (minutes > 0) { totalWorkingMinutes += minutes; ordersWithFirstChange++; }
  }
  const avgCallDuration = ordersWithFirstChange > 0 ? Math.round(totalWorkingMinutes / ordersWithFirstChange) : 0;

  // Delivery duration: SHIPPED → DELIVERED
  let totalDeliveryMinutes = 0, deliveryCount = 0;
  for (const order of orders) {
    const shipped = order.statusHistory.find((h) => h.newStatus === "SHIPPED");
    const delivered = order.statusHistory.find((h) => DELIVERED_STATUSES.includes(h.newStatus));
    if (shipped && delivered) {
      const mins = calcWorkingMinutes(shipped.createdAt, delivered.createdAt);
      if (mins > 0) { totalDeliveryMinutes += mins; deliveryCount++; }
    }
  }
  const avgDeliveryDuration = deliveryCount > 0 ? Math.round(totalDeliveryMinutes / deliveryCount) : 0;

  // Return duration: RETURN_TRANSFER/CUSTOMER_REORDERED → RETURN_READY
  let totalReturnMinutes = 0, returnCount = 0;
  for (const order of orders) {
    const returnStart = order.statusHistory.find((h) => h.newStatus === "RETURN_TRANSFER" || h.newStatus === "CUSTOMER_REORDERED");
    const returnReady = order.statusHistory.find((h) => h.newStatus === "RETURN_READY");
    if (returnStart && returnReady) {
      const mins = calcWorkingMinutes(returnStart.createdAt, returnReady.createdAt);
      if (mins > 0) { totalReturnMinutes += mins; returnCount++; }
    }
  }
  const avgReturnDuration = returnCount > 0 ? Math.round(totalReturnMinutes / returnCount) : 0;

  // Confirmation rate: orders that moved from NEW to confirmed/delivered status
  const confirmedStatuses = ["CONFIRMED", "SHIPPED", "IN_DELIVERY", "ON_HOLD", ...DELIVERED_STATUSES, ...RETURN_STATUSES];
  const confirmedOrders = orders.filter((o) => o.statusHistory.some((h) => h.newStatus !== "NEW" && confirmedStatuses.includes(h.newStatus)));
  const confirmationRate = totalOrders > 0 ? Math.round((confirmedOrders.length / totalOrders) * 100) : 0;

  const wilayaStats: Record<string, {
    id: string; name: string; orders: number; delivered: number; returned: number;
    revenue: number; cost: number; deliveryRate: number; returnRate: number;
  }> = {};
  for (const o of orders) {
    const key = o.wilayaId || "unknown";
    if (!wilayaStats[key]) wilayaStats[key] = { id: key, name: wilayaMap.get(key) || key, orders: 0, delivered: 0, returned: 0, revenue: 0, cost: 0, deliveryRate: 0, returnRate: 0 };
    wilayaStats[key].orders++;
    if (DELIVERED_STATUSES.includes(o.status)) {
      wilayaStats[key].delivered++;
      wilayaStats[key].revenue += o.totalPrice;
      wilayaStats[key].cost += (o.purchasePrice || 0) * o.quantity;
    }
    if (RETURN_STATUSES.includes(o.status)) wilayaStats[key].returned++;
  }
  for (const w of Object.values(wilayaStats)) {
    const finished = w.delivered + w.returned;
    w.deliveryRate = finished > 0 ? Math.round((w.delivered / finished) * 100) : 0;
    w.returnRate = finished > 0 ? Math.round((w.returned / finished) * 100) : 0;
  }

  const bestWilayas = Object.values(wilayaStats)
    .filter((w) => w.delivered + w.returned >= 3)
    .sort((a, b) => b.deliveryRate - a.deliveryRate).slice(0, 5);

  const worstWilayas = Object.values(wilayaStats)
    .filter((w) => w.returned > 0)
    .sort((a, b) => b.returnRate - a.returnRate).slice(0, 5);

  const productStats: Record<string, {
    id: string; name: string; orders: number; delivered: number; returned: number;
    revenue: number; cost: number; profit: number; roi: number;
    deliveryRate: number; returnRate: number; views: number; conversionRate: number;
  }> = {};
  for (const o of orders) {
    const key = o.productId;
    if (!productStats[key]) productStats[key] = { id: key, name: productNameMap.get(key) || key, orders: 0, delivered: 0, returned: 0, revenue: 0, cost: 0, profit: 0, roi: 0, deliveryRate: 0, returnRate: 0, views: 0, conversionRate: 0 };
      productStats[key].orders++;
      if (DELIVERED_STATUSES.includes(o.status)) {
        productStats[key].delivered++;
        productStats[key].revenue += o.totalPrice;
        productStats[key].cost += (o.purchasePrice || 0) * o.quantity;
      }
    if (RETURN_STATUSES.includes(o.status)) productStats[key].returned++;
  }
  for (const p of Object.values(productStats)) {
    p.profit = p.revenue - p.cost;
    const finished = p.delivered + p.returned;
    p.deliveryRate = finished > 0 ? Math.round((p.delivered / finished) * 100) : 0;
    p.returnRate = finished > 0 ? Math.round((p.returned / finished) * 100) : 0;
    p.roi = p.cost > 0 ? Math.round((p.profit / p.cost) * 100) : 0;
  }

  const topProducts = Object.values(productStats).sort((a, b) => b.orders - a.orders).slice(0, 10);
  const profitableProducts = Object.values(productStats).filter((p) => p.delivered >= 1).sort((a, b) => b.profit - a.profit).slice(0, 10);

  return {
    overview: { totalOrders, totalAbandoned, totalRevenue, totalCost, totalExpenses, netProfit, deliveryRate, returnRate, avgCallDuration, avgDeliveryDuration, avgReturnDuration, confirmationRate, deliveredCount: delivered.length, returnedCount: returned.length, confirmedCount: confirmedOrders.length },
    currentMonth: { orders: currentMonthOrders.length, profit: currentMonthProfit },
    lastMonth: { orders: lastMonthOrders.length, profit: lastMonthProfit },
    statusCounts: allStatuses,
    bestWilayas, worstWilayas, topProducts, profitableProducts,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const time = searchParams.get("time") || "all";
    const type = searchParams.get("type") || "all";
    const dateFrom = getDateRange(time);

    let expenses: { amount: number }[] = [];
    try { expenses = await prisma.expense.findMany({ select: { amount: true } }); } catch { expenses = []; }

    const wilayas = await prisma.wilaya.findMany({ select: { id: true, name: true } });
    const wilayaMap = new Map(wilayas.map((w) => [w.id, w.name]));

    const products = await prisma.product.findMany({ select: { id: true, name: true } });
    const productNameMap = new Map(products.map((p) => [p.id, p.name]));

    const orderWhere: any = dateFrom ? { createdAt: { gte: dateFrom } } : {};
    const abandonedWhere: any = dateFrom ? { createdAt: { gte: dateFrom } } : {};

    const [rawOrders, rawAbandoned] = await Promise.all([
      type !== "abandoned" ? prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true, status: true, createdAt: true,
          productPrice: true, shippingPrice: true, totalPrice: true,
          quantity: true, purchasePrice: true, wilayaId: true, productId: true,
          statusHistory: { orderBy: { createdAt: "asc" }, select: { newStatus: true, createdAt: true, changedBy: true } },
        },
      }) : [],
      type !== "orders" ? prisma.abandonedOrder.findMany({
        where: abandonedWhere,
        select: {
          id: true, status: true, createdAt: true,
          productPrice: true, shippingPrice: true, totalPrice: true, quantity: true,
        },
      }) : [],
    ]);

    const result = buildStats(rawOrders, rawAbandoned, expenses, wilayaMap, productNameMap);

    // Add default views/conversion to all products
    for (const p of result.topProducts) { p.views = 0; p.conversionRate = 0; }
    for (const p of result.profitableProducts) { p.views = 0; p.conversionRate = 0; }

    // Fetch page views per product
    try {
      const viewDateFrom = dateFrom || new Date("2020-01-01");
      const productIds = [...new Set([...result.topProducts.map((p) => p.id), ...result.profitableProducts.map((p) => p.id)])];
      if (productIds.length > 0) {
        const views = await prisma.productPageView.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, createdAt: { gte: viewDateFrom } },
          _count: { id: true },
        });
        const viewMap = new Map<string, number>();
        for (const v of views) viewMap.set(v.productId, v._count.id);
        for (const p of result.topProducts) {
          p.views = viewMap.get(p.id) || 0;
          p.conversionRate = p.views > 0 ? Math.round((p.orders / p.views) * 100) : 0;
        }
        for (const p of result.profitableProducts) {
          p.views = viewMap.get(p.id) || 0;
          p.conversionRate = p.views > 0 ? Math.round((p.orders / p.views) * 100) : 0;
        }
      }
    } catch (e) {
      console.error("Page views fetch failed:", e);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
