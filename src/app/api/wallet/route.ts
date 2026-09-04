import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [deliveredOrders, readyOrders, paidOrders, abdDeliveredOrders, abdReadyOrders, abdPaidOrders, products] = await Promise.all([
      prisma.order.findMany({ where: { status: "DELIVERED" }, select: { productPrice: true, quantity: true, productId: true } }),
      prisma.order.findMany({ where: { status: "READY_FOR_PAYMENT" }, select: { productPrice: true, quantity: true, productId: true } }),
      prisma.order.findMany({ where: { status: "PAID" }, select: { productPrice: true, quantity: true } }),
      prisma.abandonedOrder.findMany({ where: { status: "DELIVERED" }, select: { productPrice: true, purchasePrice: true, quantity: true, productId: true } }),
      prisma.abandonedOrder.findMany({ where: { status: "READY_FOR_PAYMENT" }, select: { productPrice: true, purchasePrice: true, quantity: true, productId: true } }),
      prisma.abandonedOrder.findMany({ where: { status: "PAID" }, select: { productPrice: true, purchasePrice: true, quantity: true } }),
      prisma.product.findMany({ select: { id: true, name: true } }),
    ]);

    const nameMap = new Map(products.map((p) => [p.id, p.name]));

    const sumAll = (a: { productPrice: number | null; quantity: number }[], b: { productPrice: number | null; quantity: number }[]) =>
      a.reduce((s, o) => s + (o.productPrice || 0) * o.quantity, 0) + b.reduce((s, o) => s + (o.productPrice || 0) * o.quantity, 0);
    const countAll = (a: any[], b: any[]) => a.length + b.length;
    const unitsAll = (a: { quantity: number }[], b: { quantity: number }[]) =>
      a.reduce((s, o) => s + o.quantity, 0) + b.reduce((s, o) => s + o.quantity, 0);

    const deliveredTotal = sumAll(deliveredOrders, abdDeliveredOrders as any);
    const readyTotal = sumAll(readyOrders, abdReadyOrders as any);
    const paidTotal = sumAll(paidOrders, abdPaidOrders as any);

    const buildProducts = (a: { productPrice: number | null; quantity: number; productId: string }[], b: { productPrice: number | null; quantity: number; productId: string }[]) => {
      const map: Record<string, { productName: string; units: number; total: number }> = {};
      for (const o of [...a, ...b]) {
        const name = nameMap.get(o.productId) || "Unknown";
        if (!map[name]) map[name] = { productName: name, units: 0, total: 0 };
        map[name].units += o.quantity;
        map[name].total += (o.productPrice || 0) * o.quantity;
      }
      return Object.values(map).sort((a, b) => b.total - a.total);
    };

    return NextResponse.json({
      deliveredNotReady: { total: deliveredTotal, count: countAll(deliveredOrders, abdDeliveredOrders), units: unitsAll(deliveredOrders, abdDeliveredOrders as any), products: buildProducts(deliveredOrders as any, abdDeliveredOrders as any) },
      paidReady: { total: readyTotal, count: countAll(readyOrders, abdReadyOrders), units: unitsAll(readyOrders, abdReadyOrders as any), products: buildProducts(readyOrders as any, abdReadyOrders as any) },
      completedPaid: { total: paidTotal, count: countAll(paidOrders, abdPaidOrders), units: unitsAll(paidOrders, abdPaidOrders as any) },
      totalBalance: deliveredTotal + readyTotal,
    });
  } catch (error: any) {
    console.error("Wallet error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
