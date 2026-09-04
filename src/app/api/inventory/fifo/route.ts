import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Assign FIFO purchase price to an order
async function assignFifoPrice(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { productId: true, quantity: true, purchasePrice: true },
  });

  if (!order || order.purchasePrice > 0) return;

  // Get purchase entries sorted by date (oldest first)
  const entries = await prisma.purchaseEntry.findMany({
    where: { productId: order.productId, remainingQty: { gt: 0 } },
    orderBy: { date: "asc" },
  });

  if (entries.length === 0) return;

  let remaining = order.quantity;
  let totalCost = 0;
  let totalQty = 0;

  for (const entry of entries) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, entry.remainingQty || 0);
    totalCost += take * (entry.unitPrice || 0);
    totalQty += take;
    remaining -= take;
  }

  if (totalQty > 0) {
    const avgCost = totalCost / totalQty;

    await prisma.order.update({
      where: { id: orderId },
      data: { purchasePrice: avgCost },
    });

    // Deduct from purchase entries (FIFO)
    remaining = order.quantity;
    for (const entry of entries) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, entry.remainingQty || 0);
      await prisma.purchaseEntry.update({
        where: { id: entry.id },
        data: { remainingQty: (entry.remainingQty || 0) - take },
      });
      remaining -= take;
    }
  }
}

// Restore stock from purchase entries (for returns)
async function restoreStock(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { productId: true, quantity: true, purchasePrice: true },
  });

  if (!order) return;

  // Find the purchase entries that were used for this order
  // and restore their remainingQty
  const entries = await prisma.purchaseEntry.findMany({
    where: { productId: order.productId },
    orderBy: { date: "desc" },
  });

  let remaining = order.quantity;
  for (const entry of entries) {
    if (remaining <= 0) break;
    const restore = Math.min(remaining, entry.quantity || 0);
    await prisma.purchaseEntry.update({
      where: { id: entry.id },
      data: { remainingQty: (entry.remainingQty || 0) + restore },
    });
    remaining -= restore;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, orderId } = body;

    if (action === "assign") {
      await assignFifoPrice(orderId);
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      await restoreStock(orderId);
      // Also restore product stock
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { productId: true, quantity: true },
      });
      if (order) {
        await prisma.product.update({
          where: { id: order.productId },
          data: { stock: { increment: order.quantity } },
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("FIFO error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
