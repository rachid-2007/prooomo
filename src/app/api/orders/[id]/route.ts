import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Statuses that represent a completed return (stock should be restored)
const RETURN_STATUSES = ["RETURN_COMPLETED"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
        wilaya: true,
        baladya: true,
        orderItems: { include: { product: true, color: { select: { id: true, name: true, image: true } }, size: { select: { id: true, name: true } } } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, customerName, customerPhone, customerAddress, quantity, shippingPrice, wilayaId, baladyaId, totalPrice, deliveryReference, offerId, productPrice, colorId, sizeId, items } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status) {
      updateData.status = status;
    }
    if (deliveryReference !== undefined) {
      updateData.deliveryReference = deliveryReference;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (customerName) updateData.customerName = customerName;
    if (customerPhone) updateData.customerPhone = customerPhone;
    if (wilayaId) updateData.wilayaId = wilayaId;
    if (baladyaId !== undefined) updateData.baladyaId = baladyaId;
    if (customerAddress !== undefined) updateData.customerAddress = customerAddress;
    if (shippingPrice !== undefined) updateData.shippingPrice = shippingPrice;
    if (offerId !== undefined) updateData.offerId = offerId || null;

    if (Array.isArray(items) && items.length > 0) {
      const first = items[0];
      updateData.productId = first.productId;
      updateData.quantity = first.quantity;
      updateData.productPrice = first.productPrice;
      updateData.purchasePrice = first.purchasePrice || 0;
      const productTotal = items.reduce((sum: number, i: any) => sum + (i.productPrice * i.quantity), 0);
      const finalShipping = shippingPrice ?? existingOrder.shippingPrice;
      updateData.totalPrice = productTotal + finalShipping;
    } else {
      if (quantity !== undefined) updateData.quantity = quantity;
      if (productPrice !== undefined) updateData.productPrice = productPrice;
      const finalQuantity = quantity ?? existingOrder.quantity;
      const finalShipping = shippingPrice ?? existingOrder.shippingPrice;
      const finalProductPrice = productPrice ?? existingOrder.productPrice;
      updateData.totalPrice = finalProductPrice * finalQuantity + finalShipping;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        variant: true,
        wilaya: true,
        baladya: true,
        orderItems: { include: { product: true, color: { select: { id: true, name: true, image: true } }, size: { select: { id: true, name: true } } } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (Array.isArray(items) && items.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      await prisma.orderItem.createMany({
        data: items.map((i: any) => ({
          orderId: id,
          productId: i.productId,
          quantity: i.quantity,
          productPrice: i.productPrice,
          purchasePrice: i.purchasePrice || 0,
          offerId: i.offerId || null,
          colorId: i.colorId || null,
          sizeId: i.sizeId || null,
        })),
      });
    }

    // Create status history if status changed
    if (status && status !== existingOrder.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: existingOrder.status,
          newStatus: status,
          note: notes,
        },
      });

      // Handle stock changes based on status transitions
      const oldStatus = existingOrder.status;
      const newStatus = status;
      const orderQty = existingOrder.quantity;
      const productId = existingOrder.productId;

      const isReturned = RETURN_STATUSES.includes(newStatus);

      // FIFO: assign purchase price at CONFIRMED (preview only)
      if (oldStatus === "NEW" && newStatus === "CONFIRMED" && existingOrder.purchasePrice === 0) {
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
            await prisma.order.update({ where: { id }, data: { purchasePrice: avgCost } });
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
            await prisma.order.update({ where: { id }, data: { purchasePrice: avgCost, consumedEntries: JSON.stringify(consumed) } });
          }
          // Deduct from purchase entries
          remaining = orderQty;
          for (const entry of entries) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, entry.remainingQty || 0);
            await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: (entry.remainingQty || 0) - take } });
            remaining -= take;
          }

          // Deduct from color/size stock
          const shippedOrderItems = await prisma.orderItem.findMany({ where: { orderId: id } });
          for (const item of shippedOrderItems) {
            if (item.colorId) {
              try { await prisma.productColor.update({ where: { id: item.colorId }, data: { stock: { decrement: item.quantity } } }); } catch {}
            }
            if (item.sizeId) {
              try { await prisma.productSize.update({ where: { id: item.sizeId }, data: { stock: { decrement: item.quantity } } }); } catch {}
            }
          }
        }
      }

      // RETURN_COMPLETED: restore to exact entries consumed (not just last entries)
      if (isReturned && existingOrder.purchasePrice && existingOrder.purchasePrice > 0) {
        if (existingOrder.consumedEntries) {
          const consumed: { entryId: string; qty: number }[] = JSON.parse(existingOrder.consumedEntries);
          for (const c of consumed) {
            await prisma.purchaseEntry.update({ where: { id: c.entryId }, data: { remainingQty: { increment: c.qty } } });
          }
        } else {
          // Fallback: restore to last entries
          const restoreEntries = await prisma.purchaseEntry.findMany({ where: { productId }, orderBy: { date: "desc" } });
          let remaining = orderQty;
          for (const entry of restoreEntries) {
            if (remaining <= 0) break;
            const restore = Math.min(remaining, entry.remainingQty || 0);
            await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: { increment: restore } } });
            remaining -= restore;
          }
        }

        // Restore color/size stock on return
        const returnOrderItems = await prisma.orderItem.findMany({ where: { orderId: id } });
        for (const item of returnOrderItems) {
          if (item.colorId) {
            try { await prisma.productColor.update({ where: { id: item.colorId }, data: { stock: { increment: item.quantity } } }); } catch {}
          }
          if (item.sizeId) {
            try { await prisma.productSize.update({ where: { id: item.sizeId }, data: { stock: { increment: item.quantity } } }); } catch {}
          }
        }
      }
    }

    // Auto-create payment batch when status changes to PAID
    if (status && status !== existingOrder.status && status === "PAID") {
      const product = await prisma.product.findUnique({
        where: { id: existingOrder.productId },
        select: { name: true },
      });
      const productName = product?.name || "Unknown";
      const batchId = `pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const summary = `${productName}(${existingOrder.quantity})`;
      const productDetails = JSON.stringify([{ name: productName, quantity: existingOrder.quantity, orderCount: 1, total: existingOrder.totalPrice }]);
      const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");

      let nextBatchNumber = 1;
      if (isPostgres) {
        const result = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX("batchNumber"), 0) + 1 as next FROM "PaymentBatch"`) as any[];
        nextBatchNumber = Number(result[0]?.next || 1);
        await prisma.$executeRawUnsafe(`
          INSERT INTO "PaymentBatch" ("id", "batchNumber", "totalAmount", "orderCount", "productSummary", "productDetails", "paidAt", "note", "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, batchId, nextBatchNumber, existingOrder.totalPrice, 1, summary, productDetails, now, `Order ${existingOrder.orderNumber}`, now);
      } else {
        const last = await prisma.paymentBatch.findFirst({ orderBy: { batchNumber: "desc" }, select: { batchNumber: true } });
        nextBatchNumber = (last?.batchNumber || 0) + 1;
        await prisma.paymentBatch.create({
          data: {
            batchNumber: nextBatchNumber,
            totalAmount: existingOrder.totalPrice,
            orderCount: 1,
            productSummary: summary,
            productDetails,
            note: `Order ${existingOrder.orderNumber}`,
          },
        });
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get order before deletion to restore stock if needed
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (order && order.status !== "NEW") {
      // Restore purchase entry remainingQty if FIFO was assigned
      if (order.purchasePrice && order.purchasePrice > 0) {
        const restoreEntries = await prisma.purchaseEntry.findMany({
          where: { productId: order.productId },
          orderBy: { date: "desc" },
        });
        let remaining = order.quantity;
        for (const entry of restoreEntries) {
          if (remaining <= 0) break;
          const restore = Math.min(remaining, entry.remainingQty || 0);
          await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { remainingQty: (entry.remainingQty || 0) + restore } });
          remaining -= restore;
        }
      }
    }

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
