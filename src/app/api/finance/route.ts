import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SALES_STATUSES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const customMonth = searchParams.get("customMonth");
    const productId = searchParams.get("productId");

    let dateFilter: any = {};
    const now = new Date();

    if (period === "currentMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 19);
      dateFilter = { gte: start, lte: now };
    } else if (period === "lastMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 19);
      const end = new Date(now.getFullYear(), now.getMonth() - 1, 19);
      dateFilter = { gte: start, lt: end };
    } else if (period === "customMonth" && customMonth) {
      const [y, m] = customMonth.split("-").map(Number);
      const start = new Date(y, m - 1, 19);
      const end = new Date(y, m, 19);
      dateFilter = { gte: start, lt: end };
    }

    const where: any = { status: { in: SALES_STATUSES } };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (productId) {
      where.productId = productId;
    }

    const abdWhere: any = { status: { in: SALES_STATUSES } };
    if (Object.keys(dateFilter).length > 0) {
      abdWhere.createdAt = dateFilter;
    }
    if (productId) {
      abdWhere.productId = productId;
    }

    const [orders, abdOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          quantity: true,
          productPrice: true,
          shippingPrice: true,
          purchasePrice: true,
          productId: true,
          createdAt: true,
        },
      }),
      prisma.abandonedOrder.findMany({
        where: abdWhere,
        select: {
          quantity: true,
          productPrice: true,
          purchasePrice: true,
          productId: true,
          createdAt: true,
        },
      }),
    ]);

    const productMap: Record<string, {
      name: string;
      image: string | null;
      sales: number;
      orderCount: number;
      revenue: number;
      netSales: number;
      cost: number;
      profit: number;
      expenses: number;
      expenseBreakdown: Record<string, number>;
    }> = {};

    let totalRevenue = 0;
    let totalNetSales = 0;
    let totalCost = 0;
    let totalOrders = 0;
    let totalUnits = 0;

    const processOrder = (order: { quantity: number; productPrice: number | null; shippingPrice?: number; purchasePrice: number | null; productId: string }) => {
      totalOrders++;
      totalUnits += order.quantity;

      const shipping = (order as any).shippingPrice || 0;
      const revenue = ((order.productPrice || 0) + shipping) * order.quantity;
      const netSales = (order.productPrice || 0) * order.quantity;
      const cost = (order.purchasePrice || 0) * order.quantity;
      const profit = netSales - cost;

      totalRevenue += revenue;
      totalNetSales += netSales;
      totalCost += cost;

      if (!productMap[order.productId]) {
        productMap[order.productId] = {
          name: "Unknown",
          image: null,
          sales: 0,
          orderCount: 0,
          revenue: 0,
          netSales: 0,
          cost: 0,
          profit: 0,
          expenses: 0,
          expenseBreakdown: {},
        };
      }

      const p = productMap[order.productId];
      p.sales += order.quantity;
      p.orderCount += 1;
      p.revenue += revenue;
      p.netSales += netSales;
      p.cost += cost;
      p.profit += profit;
    };

    for (const order of orders) processOrder(order);
    for (const order of abdOrders) processOrder(order as any);

    const allProductIds = Object.keys(productMap);
    if (allProductIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: allProductIds } },
        select: { id: true, name: true, images: true },
      });
      for (const prod of products) {
        const entry = productMap[prod.id];
        if (entry) {
          entry.name = prod.name;
          try { const arr = JSON.parse(prod.images || "[]"); if (arr.length > 0) entry.image = arr[0]; } catch {}
        }
      }
    }

    // Expenses
    const expenseWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      expenseWhere.date = dateFilter;
    }
    if (productId) {
      expenseWhere.productId = productId;
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        description: true,
        amount: true,
        category: true,
        productId: true,
        date: true,
        note: true,
      },
      orderBy: { date: "desc" },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Add expenses to product map
    for (const expense of expenses) {
      if (expense.productId && productMap[expense.productId]) {
        productMap[expense.productId].expenses += expense.amount;
        const key = expense.description || "أخرى";
        productMap[expense.productId].expenseBreakdown[key] = (productMap[expense.productId].expenseBreakdown[key] || 0) + expense.amount;
      }
    }

    // Daily breakdown
    const dailyData: Record<string, { revenue: number; cost: number; profit: number; orders: number; expenses: number }> = {};
    const addOrderToDaily = (order: { quantity: number; productPrice: number | null; shippingPrice?: number; purchasePrice: number | null; createdAt: Date }) => {
      const day = order.createdAt.toISOString().split("T")[0];
      if (!dailyData[day]) dailyData[day] = { revenue: 0, cost: 0, profit: 0, orders: 0, expenses: 0 };
      const shipping = (order as any).shippingPrice || 0;
      dailyData[day].revenue += ((order.productPrice || 0) + shipping) * order.quantity;
      dailyData[day].cost += (order.purchasePrice || 0) * order.quantity;
      dailyData[day].profit += (order.productPrice || 0) * order.quantity - (order.purchasePrice || 0) * order.quantity;
      dailyData[day].orders += 1;
    };
    for (const order of orders) addOrderToDaily(order);
    for (const order of abdOrders) addOrderToDaily(order as any);
    for (const expense of expenses) {
      const day = expense.date.toISOString().split("T")[0];
      if (!dailyData[day]) dailyData[day] = { revenue: 0, cost: 0, profit: 0, orders: 0, expenses: 0 };
      dailyData[day].expenses += expense.amount;
    }

    const netProfit = totalNetSales - totalCost - totalExpenses;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalNetSales,
        totalCost,
        totalExpenses,
        totalProfit: netProfit,
        totalOrders,
        totalUnits,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        profitMargin: totalNetSales > 0 ? Math.round((netProfit / totalNetSales) * 100) : 0,
      },
      products: Object.values(productMap).sort((a, b) => b.profit - a.profit),
      expenses,
      daily: Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
    });
  } catch (error) {
    console.error("Finance error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
