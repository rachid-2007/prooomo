import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  return handleRecalculate();
}

export async function POST() {
  return handleRecalculate();
}

async function handleRecalculate() {
  try {
    // Step 1: Get ALL purchase entries and compute total remaining per product
    const allEntries = await prisma.purchaseEntry.findMany({
      select: { id: true, productId: true, remainingQty: true, unitPrice: true, quantity: true },
    });

    const entryMap = new Map<string, typeof allEntries>();
    for (const e of allEntries) {
      if (!e.productId) continue;
      if (!entryMap.has(e.productId)) entryMap.set(e.productId, []);
      entryMap.get(e.productId)!.push(e);
    }

    // Step 2: Get ALL shipped orders per product
    const shippedStatuses = ["SHIPPED", "IN_DELIVERY", "ON_HOLD", "DELIVERED", "READY_FOR_PAYMENT", "PAID", "CUSTOMER_REORDERED", "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED"];

    const allOrders = await prisma.order.findMany({
      where: { status: { in: shippedStatuses }, productId: { not: "" } },
      select: { id: true, orderNumber: true, productId: true, quantity: true, status: true },
    });

    // Step 3: Compute total shipped quantity per product
    const shippedPerProduct = new Map<string, number>();
    for (const o of allOrders) {
      if (!o.productId) continue;
      shippedPerProduct.set(o.productId, (shippedPerProduct.get(o.productId) || 0) + (o.quantity || 1));
    }

    // Step 4: For each product, reset ALL entries to their original quantity, then deduct FIFO
    const results: { product: string; original: number; shipped: number; newRemaining: number }[] = [];

    for (const [productId, totalShipped] of shippedPerProduct) {
      const entries = entryMap.get(productId);
      if (!entries || entries.length === 0) continue;

      const totalOriginal = entries.reduce((s, e) => s + (e.quantity || 0), 0);

      // First: reset all entries to their original quantity
      for (const entry of entries) {
        await prisma.purchaseEntry.update({
          where: { id: entry.id },
          data: { remainingQty: entry.quantity || 0 },
        });
      }

      // Second: deduct FIFO - consume from oldest entries first
      let remaining = totalShipped;
      const consumed: { entryId: string; qty: number; unitPrice: number }[] = [];

      for (const entry of entries) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, entry.quantity || 0);
        if (take > 0) {
          consumed.push({ entryId: entry.id, qty: take, unitPrice: entry.unitPrice || 0 });
          await prisma.purchaseEntry.update({
            where: { id: entry.id },
            data: { remainingQty: (entry.quantity || 0) - take },
          });
        }
        remaining -= take;
      }

      // Third: update ALL orders for this product with correct purchasePrice
      const avgCost = consumed.length > 0 ? consumed.reduce((s, c) => s + c.qty * c.unitPrice, 0) / consumed.reduce((s, c) => s + c.qty, 0) : 0;

      for (const order of allOrders) {
        if (order.productId !== productId) continue;
        const orderQty = order.quantity || 1;
        const orderConsumed = consumed.filter((c) => c.qty > 0).slice(0, Math.ceil(orderQty));
        await prisma.order.update({
          where: { id: order.id },
          data: {
            purchasePrice: avgCost,
            consumedEntries: JSON.stringify(orderConsumed.length > 0 ? orderConsumed : consumed.slice(0, 1)),
          },
        });
      }

      const newRemaining = entries.reduce((s, e) => s + (e.quantity || 0), 0) - totalShipped;
      results.push({ product: productId, original: totalOriginal, shipped: totalShipped, newRemaining: Math.max(0, newRemaining) });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
