import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const RESERVED = ["CONFIRMED"];
const IN_DELIVERY = ["SHIPPED", "IN_DELIVERY", "ON_HOLD"];
const SALES = ["DELIVERED", "READY_FOR_PAYMENT", "PAID"];
const RETURNING = ["CUSTOMER_REORDERED", "RETURN_TRANSFER", "RETURN_READY"];

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, stock: true, initialStock: true },
      orderBy: { name: "asc" },
    });

    const productIds = products.map((p) => p.id);

    const [allOrders, allAbandonedOrders, purchaseAggs, purchaseEntries, transitOrders, abdTransitOrders] = await Promise.all([
      productIds.length > 0 ? prisma.order.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, quantity: true, status: true, productPrice: true, shippingPrice: true, purchasePrice: true },
      }) : Promise.resolve([]),
      productIds.length > 0 ? prisma.abandonedOrder.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, quantity: true, status: true, productPrice: true, shippingPrice: true },
      }) : Promise.resolve([] as any[]),
      productIds.length > 0 ? prisma.purchaseEntry.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _sum: { remainingQty: true },
      }) : Promise.resolve([] as any[]),
      productIds.length > 0 ? prisma.purchaseEntry.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, remainingQty: true, unitPrice: true, quantity: true },
      }) : Promise.resolve([] as any[]),
      productIds.length > 0 ? prisma.order.findMany({
        where: { productId: { in: productIds }, status: { in: [...IN_DELIVERY, ...RETURNING] } },
        select: { productId: true, quantity: true, purchasePrice: true, status: true },
      }) : Promise.resolve([] as any[]),
      productIds.length > 0 ? prisma.abandonedOrder.findMany({
        where: { productId: { in: productIds }, status: { in: [...IN_DELIVERY, ...RETURNING] } },
        select: { productId: true, quantity: true, purchasePrice: true, status: true },
      }) : Promise.resolve([] as any[]),
    ]);

    // Index lookups
    const purchaseAggMap = new Map(purchaseAggs.map((p) => [p.productId, p._sum.remainingQty || 0]));

    const purchaseEntryMap = new Map<string, { remainingQty: number; unitPrice: number; quantity: number }[]>();
    const avgPurchasePrice = new Map<string, number>();
    for (const pe of purchaseEntries) {
      if (!purchaseEntryMap.has(pe.productId)) purchaseEntryMap.set(pe.productId, []);
      purchaseEntryMap.get(pe.productId)!.push({ remainingQty: pe.remainingQty || 0, unitPrice: pe.unitPrice || 0, quantity: pe.quantity || 0 });
    }
    // Calculate average purchase price per product from ALL entries (not just remaining)
    for (const [pid, entries] of purchaseEntryMap) {
      const totalQty = entries.reduce((s, e) => s + (e.quantity || 0), 0);
      const totalCost = entries.reduce((s, e) => s + (e.quantity || 0) * (e.unitPrice || 0), 0);
      if (totalQty > 0) avgPurchasePrice.set(pid, totalCost / totalQty);
    }

    const transitMap = new Map<string, number>();
    const returnMap = new Map<string, number>();
    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    for (const o of transitOrders) {
      const unitCost = o.purchasePrice || avgPurchasePrice.get(o.productId) || priceMap.get(o.productId) || 0;
      const val = unitCost * o.quantity;
      if (IN_DELIVERY.includes(o.status)) {
        transitMap.set(o.productId, (transitMap.get(o.productId) || 0) + val);
      } else if (RETURNING.includes(o.status)) {
        returnMap.set(o.productId, (returnMap.get(o.productId) || 0) + val);
      }
    }
    for (const o of abdTransitOrders) {
      const unitCost = o.purchasePrice || avgPurchasePrice.get(o.productId) || priceMap.get(o.productId) || 0;
      const val = unitCost * o.quantity;
      if (IN_DELIVERY.includes(o.status)) {
        transitMap.set(o.productId, (transitMap.get(o.productId) || 0) + val);
      } else if (RETURNING.includes(o.status)) {
        returnMap.set(o.productId, (returnMap.get(o.productId) || 0) + val);
      }
    }

    const inventory = products.map((product) => {
      let newOrders = 0, reserved = 0, inDelivery = 0, returning = 0, sales = 0, totalRevenue = 0, totalCost = 0;

      for (const order of allOrders) {
        if (order.productId !== product.id) continue;
        if (order.status === "NEW") { newOrders += order.quantity; }
        else if (RESERVED.includes(order.status)) { reserved += order.quantity; }
        else if (IN_DELIVERY.includes(order.status)) { inDelivery += order.quantity; }
        else if (RETURNING.includes(order.status)) { returning += order.quantity; }
        else if (SALES.includes(order.status)) {
          sales += order.quantity;
          totalRevenue += (order.productPrice + order.shippingPrice) * order.quantity;
          totalCost += (order.purchasePrice || 0) * order.quantity;
        }
      }

      for (const ao of allAbandonedOrders) {
        if (ao.productId !== product.id) continue;
        if (RESERVED.includes(ao.status)) { reserved += ao.quantity; }
        else if (IN_DELIVERY.includes(ao.status)) { inDelivery += ao.quantity; }
        else if (RETURNING.includes(ao.status)) { returning += ao.quantity; }
        else if (SALES.includes(ao.status)) {
          sales += ao.quantity;
          totalRevenue += (ao.productPrice || 0) * ao.quantity;
        }
      }

      const available = purchaseAggMap.get(product.id) || 0;
      const entries = purchaseEntryMap.get(product.id) || [];
      const inventoryValue = entries.reduce((sum, e) => sum + (e.remainingQty || 0) * (e.unitPrice || 0), 0);
      const inTransitValue = transitMap.get(product.id) || 0;
      const returnValue = returnMap.get(product.id) || 0;

      return {
        ...product,
        available,
        newOrders,
        reserved,
        inDelivery,
        returning,
        sales,
        totalRevenue,
        totalCost,
        inventoryValue,
        inTransitValue,
        returnValue,
        lowStock: available <= 5 && available >= 0,
        outOfStock: available <= 0,
      };
    });

    return NextResponse.json({
      products: inventory,
      summary: {
        totalProducts: inventory.length,
        totalInventoryValue: inventory.reduce((s, p) => s + p.inventoryValue, 0),
        totalInTransitValue: inventory.reduce((s, p) => s + p.inTransitValue, 0),
        totalReturnValue: inventory.reduce((s, p) => s + p.returnValue, 0),
      },
    });
  } catch (error) {
    console.error("Inventory error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
