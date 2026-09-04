import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const RETURN_STATUSES = ["RETURN_COMPLETED"];

function toOrderWithRelations(ao: any) {
  let statusHistory: any[] = [];
  try { statusHistory = JSON.parse(ao.statusHistory || "[]"); } catch { statusHistory = []; }

  return {
    id: ao.id,
    orderNumber: `ABD-${ao.id.slice(-6).toUpperCase()}`,
    productId: ao.productId,
    variantId: null,
    offerId: ao.offerId || null,
    customerName: ao.customerName || "عميل متروك",
    customerPhone: ao.customerPhone,
    customerAddress: null,
    wilayaId: ao.wilayaCode || "",
    baladyaId: null,
    quantity: ao.quantity || 1,
    productPrice: ao.productPrice || 0,
    shippingPrice: ao.shippingPrice || 0,
    totalPrice: ao.totalPrice || ((ao.productPrice || 0) * (ao.quantity || 1) + (ao.shippingPrice || 0)),
    status: ao.status === "SENT" ? "SHIPPED" : (ao.status || "NEW"),
    attemptCount: 0,
    notes: ao.notes || `طلب مetroك - السبب: ${ao.reason === "timeout" ? "متروك (timeout)" : "غادر الصفحة"}`,
    deliveryReference: ao.deliveryReference || null,
    shippingCompany: ao.shippingCompany || null,
    createdAt: ao.createdAt,
    updatedAt: ao.createdAt,
    product: {
      id: ao.productId,
      name: ao.productName,
      slug: ao.productName?.toLowerCase().replace(/\s+/g, "-") || "",
      shortDescription: null,
      fullDescription: null,
      price: ao.productPrice || 0,
      images: ao.productImages || "[]",
      thumbnail: null,
      orderCount: 0,
      isActive: true,
      createdAt: ao.createdAt,
      updatedAt: ao.createdAt,
    },
    variant: null,
    wilaya: {
      id: ao.wilayaCode || "",
      name: ao.wilayaName || ao.wilayaCode || "",
      code: ao.wilayaCode || "",
      baladyas: [],
      orders: [],
    },
    baladya: ao.baladyaName ? {
      id: "",
      name: ao.baladyaName,
      arabicName: ao.baladyaName,
      wilayaId: ao.wilayaCode || "",
      code: null,
      orders: [],
    } : null,
    statusHistory: statusHistory.map((h: any) => ({
      ...h,
      id: h.id || "",
      createdAt: new Date(h.createdAt),
    })),
    _isAbandoned: true,
    _abandonedReason: ao.reason,
    deliveryMethod: ao.deliveryMethod || null,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, customerName, customerPhone, quantity, productPrice, shippingPrice, totalPrice, deliveryReference, shippingCompany, wilayaCode, wilayaName, baladyaName, deliveryMethod } = body;

    const existing = await prisma.abandonedOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};
    if (status !== undefined) data.status = status;
    if (customerName !== undefined) data.customerName = customerName;
    if (customerPhone !== undefined) data.customerPhone = customerPhone;
    if (quantity !== undefined) data.quantity = quantity;
    if (productPrice !== undefined) data.productPrice = productPrice;
    if (shippingPrice !== undefined) data.shippingPrice = shippingPrice;
    if (totalPrice !== undefined) data.totalPrice = totalPrice;
    if (deliveryReference !== undefined) data.deliveryReference = deliveryReference;
    if (shippingCompany !== undefined) data.shippingCompany = shippingCompany;
    if (wilayaCode !== undefined) data.wilayaCode = wilayaCode;
    if (wilayaName !== undefined) data.wilayaName = wilayaName;
    if (baladyaName !== undefined) data.baladyaName = baladyaName;
    if (deliveryMethod !== undefined) data.deliveryMethod = deliveryMethod;

    const updated = await prisma.abandonedOrder.update({
      where: { id },
      data,
    });

    // Record status change in statusHistory
    if (status && status !== existing.status) {
      try {
        const history: any[] = JSON.parse(existing.statusHistory || "[]");
        history.unshift({
          id: `sh_${Date.now()}`,
          oldStatus: existing.status,
          newStatus: status,
          changedBy: null,
          note: null,
          createdAt: new Date().toISOString(),
        });
        await prisma.abandonedOrder.update({
          where: { id },
          data: { statusHistory: JSON.stringify(history) },
        });
      } catch (e) {
        console.error("Failed to record status history:", e);
      }
    }

    // Handle stock changes based on status transitions (same as regular orders)
    if (status && status !== existing.status) {
      try {
        const oldStatus = existing.status;
        const newStatus = status;
        const orderQty = quantity ?? existing.quantity;
        const productId = existing.productId;

        const isReturned = RETURN_STATUSES.includes(newStatus);

        // FIFO: assign purchase price at CONFIRMED (preview only)
        if (oldStatus === "NEW" && newStatus === "CONFIRMED" && (!existing.purchasePrice || existing.purchasePrice === 0)) {
          const entries = await prisma.purchaseEntry.findMany({
            where: { productId, remainingQty: { gt: 0 } },
            orderBy: { date: "asc" },
          });
          if (entries.length > 0) {
            let remaining = orderQty;
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
              await prisma.abandonedOrder.update({ where: { id }, data: { purchasePrice: avgCost } });
            }
          }
        }

        // SHIPPED: recalculate FIFO price + deduct remainingQty + save consumed entries
        if (oldStatus !== "SHIPPED" && newStatus === "SHIPPED") {
          const entries = await prisma.purchaseEntry.findMany({
            where: { productId, remainingQty: { gt: 0 } },
            orderBy: { date: "asc" },
          });
          if (entries.length > 0) {
            let remaining = orderQty;
            let totalCost = 0;
            let totalQty = 0;
            const consumed: { entryId: string; qty: number; unitPrice: number }[] = [];
            for (const entry of entries) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, entry.remainingQty || 0);
              totalCost += take * (entry.unitPrice || 0);
              totalQty += take;
              remaining -= take;
              if (take > 0) consumed.push({ entryId: entry.id, qty: take, unitPrice: entry.unitPrice || 0 });
            }
            if (totalQty > 0) {
              const avgCost = totalCost / totalQty;
              await prisma.abandonedOrder.update({ where: { id }, data: { purchasePrice: avgCost, consumedEntries: JSON.stringify(consumed) } });
            }
            // Deduct from purchase entries
            remaining = orderQty;
            for (const entry of entries) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, entry.remainingQty || 0);
              await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: (entry.remainingQty || 0) - take } });
              remaining -= take;
            }
          }
        }

        // RETURN_COMPLETED: restore to exact entries consumed
        if (isReturned) {
          if (existing.consumedEntries) {
            const consumed: { entryId: string; qty: number }[] = JSON.parse(existing.consumedEntries);
            for (const c of consumed) {
              await prisma.purchaseEntry.update({ where: { id: c.entryId }, data: { remainingQty: { increment: c.qty } } });
            }
          } else if (existing.purchasePrice && existing.purchasePrice > 0) {
            const restoreEntries = await prisma.purchaseEntry.findMany({ where: { productId }, orderBy: { date: "desc" } });
            let remaining = orderQty;
            for (const entry of restoreEntries) {
              if (remaining <= 0) break;
              const restore = Math.min(remaining, entry.remainingQty || 0);
              await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: { increment: restore } } });
              remaining -= restore;
            }
          }
        }

        // SHIPPED→CONFIRMED: restore consumed entries (return from delivery)
        if (oldStatus === "SHIPPED" && newStatus === "CONFIRMED") {
          if (existing.consumedEntries) {
            const consumed: { entryId: string; qty: number }[] = JSON.parse(existing.consumedEntries);
            for (const c of consumed) {
              await prisma.purchaseEntry.update({ where: { id: c.entryId }, data: { remainingQty: { increment: c.qty } } });
            }
          }
          await prisma.abandonedOrder.update({ where: { id }, data: { purchasePrice: null, consumedEntries: null, deliveryReference: null, shippingCompany: null } });
        }
      } catch (stockError) {
        console.error("Stock operation failed for abandoned order (status still saved):", stockError);
      }
    }

    // Re-fetch to get complete data with product images
    const refreshed = await prisma.abandonedOrder.findUnique({ where: { id } });
    return NextResponse.json(refreshed ? toOrderWithRelations(refreshed) : updated);
  } catch (error: any) {
    console.error("Error updating abandoned order:", error?.message, error?.cause?.message, error?.stack?.substring(0, 500));
    return NextResponse.json({ error: "Failed to update", detail: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const order = await prisma.abandonedOrder.findUnique({ where: { id } });

    if (order && order.status !== "NEW") {
      if (order.purchasePrice && order.purchasePrice > 0) {
        if (order.consumedEntries) {
          const consumed: { entryId: string; qty: number }[] = JSON.parse(order.consumedEntries);
          for (const c of consumed) {
            await prisma.purchaseEntry.update({ where: { id: c.entryId }, data: { remainingQty: { increment: c.qty } } });
          }
        } else {
          const restoreEntries = await prisma.purchaseEntry.findMany({ where: { productId: order.productId }, orderBy: { date: "desc" } });
          let remaining = order.quantity;
          for (const entry of restoreEntries) {
            if (remaining <= 0) break;
            const restore = Math.min(remaining, entry.remainingQty || 0);
            await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: { increment: restore } } });
            remaining -= restore;
          }
        }
      }
    }

    await prisma.abandonedOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting abandoned order:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
