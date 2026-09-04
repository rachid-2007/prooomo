import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [orders, abandonedOrders, products, expenses] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["PAID", "DELIVERED", "READY_FOR_PAYMENT"] }, createdAt: { gte: twelveMonthsAgo } },
        select: { productPrice: true, purchasePrice: true, quantity: true, createdAt: true, productId: true },
      }),
      prisma.abandonedOrder.findMany({
        where: { status: { in: ["PAID", "DELIVERED", "READY_FOR_PAYMENT"] }, createdAt: { gte: twelveMonthsAgo } },
        select: { productPrice: true, purchasePrice: true, quantity: true, createdAt: true, productId: true },
      }),
      prisma.product.findMany({ select: { id: true, name: true } }),
      prisma.expense.findMany({
        where: { date: { gte: twelveMonthsAgo } },
        select: { amount: true, date: true },
      }),
    ]);

    const productNameMap = new Map(products.map((p) => [p.id, p.name]));
    const dailyMap: Record<string, { revenue: number; cost: number; profit: number; orders: number; expenses: number }> = {};
    const monthlyMap: Record<string, { revenue: number; cost: number; profit: number; orders: number; expenses: number }> = {};
    const productMap: Record<string, { totalOrders: number; totalUnits: number; totalRevenue: number; totalCost: number }> = {};

    const processOrder = (o: { productPrice: number | null; purchasePrice?: number | null; quantity: number; createdAt: Date; productId: string }) => {
      const rev = (o.productPrice || 0) * o.quantity;
      const cost = (o.purchasePrice || 0) * o.quantity;

      if (o.createdAt >= thirtyDaysAgo) {
        const key = o.createdAt.toISOString().split("T")[0];
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, cost: 0, profit: 0, orders: 0, expenses: 0 };
        dailyMap[key].revenue += rev;
        dailyMap[key].cost += cost;
        dailyMap[key].profit += rev - cost;
        dailyMap[key].orders += 1;
      }

      const mkey = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}-01`;
      if (!monthlyMap[mkey]) monthlyMap[mkey] = { revenue: 0, cost: 0, profit: 0, orders: 0, expenses: 0 };
      monthlyMap[mkey].revenue += rev;
      monthlyMap[mkey].cost += cost;
      monthlyMap[mkey].profit += rev - cost;
      monthlyMap[mkey].orders += 1;

      const name = productNameMap.get(o.productId) || "Unknown";
      if (!productMap[name]) productMap[name] = { totalOrders: 0, totalUnits: 0, totalRevenue: 0, totalCost: 0 };
      productMap[name].totalOrders += 1;
      productMap[name].totalUnits += o.quantity;
      productMap[name].totalRevenue += rev;
      productMap[name].totalCost += cost;
    };

    for (const o of orders) processOrder(o as any);
    for (const o of abandonedOrders) processOrder(o as any);

    // Add expenses to daily and monthly maps
    for (const e of expenses) {
      const day = e.date.toISOString().split("T")[0];
      if (dailyMap[day]) dailyMap[day].expenses += e.amount;

      const mkey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}-01`;
      if (monthlyMap[mkey]) monthlyMap[mkey].expenses += e.amount;
    }

    return NextResponse.json({
      dailyProfit: Object.entries(dailyMap).map(([date, d]) => ({ date, ...d, netProfit: d.revenue - d.cost - d.expenses })).sort((a, b) => a.date.localeCompare(b.date)),
      monthlyProfit: Object.entries(monthlyMap).map(([month, m]) => ({ month, ...m, netProfit: m.revenue - m.cost - m.expenses })).sort((a, b) => a.month.localeCompare(b.month)),
      productStats: Object.entries(productMap)
        .map(([productName, p]) => ({
          productName, ...p,
          avgCostPerUnit: p.totalUnits > 0 ? p.totalCost / p.totalUnits : 0,
          avgProfitPerUnit: p.totalUnits > 0 ? (p.totalRevenue - p.totalCost) / p.totalUnits : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
