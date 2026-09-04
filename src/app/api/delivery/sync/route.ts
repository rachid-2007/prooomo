import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST() {
  return handleSync();
}

async function handleSync() {
  try {
    const settingsRows = await prisma.settings.findMany({
      where: { key: { in: ["delivery_api_token", "delivery_api_url"] } },
    });
    const settings = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);

    if (!settings.delivery_api_token || !settings.delivery_api_url) {
      return NextResponse.json({ error: "إعدادات شركة الشحن غير مكتملة" }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: {
        deliveryReference: { not: null },
        status: { notIn: ["PAID", "RETURN_COMPLETED", "CANCELLED", "FAKE"] },
      },
      select: { id: true, orderNumber: true, deliveryReference: true, status: true },
    });

    const abandonedOrders = await prisma.abandonedOrder.findMany({
      where: {
        deliveryReference: { not: null },
        status: { notIn: ["PAID", "RETURN_COMPLETED", "CANCELLED", "FAKE"] },
      },
      select: { id: true, deliveryReference: true, status: true },
    });

    if (orders.length === 0 && abandonedOrders.length === 0) {
      return NextResponse.json({ message: "لا طلبات للمزامنة", updated: 0 });
    }

    const apiUrl = settings.delivery_api_url.replace(/\/$/, "");
    const allTrackings = [
      ...orders.map((o) => o.deliveryReference).filter(Boolean),
      ...abandonedOrders.map((o) => o.deliveryReference).filter(Boolean),
    ];

    if (allTrackings.length === 0) {
      return NextResponse.json({ message: "لا طلبات للمزامنة", updated: 0 });
    }

    const BATCH_SIZE = 100;
    const allData: Record<string, any> = {};

    for (let i = 0; i < allTrackings.length; i += BATCH_SIZE) {
      const batch = allTrackings.slice(i, i + BATCH_SIZE);
      const url = `${apiUrl}/api/v1/get/orders/status?api_token=${encodeURIComponent(settings.delivery_api_token)}&trackings=${encodeURIComponent(batch.join(","))}&status=all`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        return NextResponse.json({ error: `فشل المزامنة: ${res.status}` }, { status: 502 });
      }

      const result = await res.json();
      const data = result.data || {};
      Object.assign(allData, data);
    }

    const data = allData;

    const STATUS_MAP: Record<string, string> = {
      "prete_a_expedier": "SHIPPED",
      "vers_wilaya": "SHIPPED",
      "en_preparation": "IN_DELIVERY",
      "en_livraison": "IN_DELIVERY",
      "suspendu": "ON_HOLD",
      "livre_non_encaisse": "DELIVERED",
      "encaisse_non_paye": "READY_FOR_PAYMENT",
      "paye_et_archive": "PAID",
      "retour_chez_livreur": "CUSTOMER_REORDERED",
      "retour_en_traitement": "RETURN_TRANSFER",
      "retour_recu": "RETURN_READY",
      "retour_archive": "RETURN_COMPLETED",
    };

    const COMMITTED = ["CONFIRMED", "IN_DELIVERY", "DELIVERED", "READY_FOR_PAYMENT", "PAID", "RETURN_TRANSFER", "RETURN_READY"];
    const RETURN_DONE = ["RETURN_COMPLETED"];

    let updatedCount = 0;
    const statusBreakdown: Record<string, number> = {};
    const trackingsForRemarks = new Set<string>();
    const paidOrders: { orderNumber: string; productId: string; quantity: number; totalPrice: number }[] = [];

    for (const [trackingRef, orderInfo] of Object.entries(data) as [string, any][]) {
      const deliveryStatus = orderInfo?.status?.trim() || "";
      if (!trackingRef) continue;

      const mappedStatus = deliveryStatus ? (STATUS_MAP[deliveryStatus] || null) : "RETURN_TRANSFER";
      if (!mappedStatus) continue;

      const order = orders.find((o) => o.deliveryReference === trackingRef);
      const abandonedOrder = !order ? abandonedOrders.find((o) => o.deliveryReference === trackingRef) : null;
      if (!order && !abandonedOrder) continue;

      if (order) {
        if (order.status === mappedStatus) continue;

        const oldStatus = order.status;

        await prisma.order.update({
          where: { id: order.id },
          data: { status: mappedStatus },
        });

        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: oldStatus,
            newStatus: mappedStatus,
            note: `مزامنة من DHD: ${deliveryStatus}`,
          },
        });

        statusBreakdown[mappedStatus] = (statusBreakdown[mappedStatus] || 0) + 1;

        if (mappedStatus === "PAID" && oldStatus !== "PAID") {
          const fullOrder = await prisma.order.findUnique({
            where: { id: order.id },
            select: { orderNumber: true, productId: true, quantity: true, totalPrice: true },
          });
          if (fullOrder) {
            paidOrders.push(fullOrder);
          }
        }

        const wasCommitted = COMMITTED.includes(oldStatus);
        const isCommitted = COMMITTED.includes(mappedStatus);
        const isReturned = RETURN_DONE.includes(mappedStatus);

        if (!wasCommitted && isCommitted) {
          const fullOrder = await prisma.order.findUnique({ where: { id: order.id } });
          if (fullOrder) {
            await prisma.product.update({
              where: { id: fullOrder.productId },
              data: { stock: { decrement: fullOrder.quantity } },
            });
          }
        }

        if (wasCommitted && isReturned) {
          const fullOrder = await prisma.order.findUnique({ where: { id: order.id } });
          if (fullOrder) {
            await prisma.product.update({
              where: { id: fullOrder.productId },
              data: { stock: { increment: fullOrder.quantity } },
            });
          }
        }
      } else if (abandonedOrder) {
        if (abandonedOrder.status === mappedStatus) continue;

        await prisma.abandonedOrder.update({
          where: { id: abandonedOrder.id },
          data: { status: mappedStatus },
        });

        statusBreakdown[mappedStatus] = (statusBreakdown[mappedStatus] || 0) + 1;
      }

      updatedCount++;
      trackingsForRemarks.add(trackingRef);
    }

    if (paidOrders.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: [...new Set(paidOrders.map((o) => o.productId))] } },
        select: { id: true, name: true },
      });
      const productNameMap = new Map(products.map((p) => [p.id, p.name]));

      const productSummary: Record<string, { name: string; quantity: number; total: number }> = {};
      let totalAmount = 0;

      for (const o of paidOrders) {
        const name = productNameMap.get(o.productId) || "Unknown";
        totalAmount += o.totalPrice;
        if (!productSummary[name]) {
          productSummary[name] = { name, quantity: 0, total: 0 };
        }
        productSummary[name].quantity += o.quantity;
        productSummary[name].total += o.totalPrice;
      }

      const summaryParts = Object.values(productSummary).map((p) => `${p.name}(${p.quantity})`);
      const productDetails = JSON.stringify(
        Object.values(productSummary).map((p) => ({
          name: p.name,
          quantity: p.quantity,
          orderCount: paidOrders.filter((o) => (productNameMap.get(o.productId) || "Unknown") === p.name).length,
          total: p.total,
        }))
      );

      const last = await prisma.paymentBatch.findFirst({ orderBy: { batchNumber: "desc" }, select: { batchNumber: true } });
      const nextBatchNumber = (last?.batchNumber || 0) + 1;

      await prisma.paymentBatch.create({
        data: {
          batchNumber: nextBatchNumber,
          totalAmount,
          orderCount: paidOrders.length,
          productSummary: summaryParts.join(", "),
          productDetails,
          paidAt: new Date(),
          note: `دفعة مزامنة DHD - ${paidOrders.length} طلب`,
        },
      });
    }

    return NextResponse.json({
      message: `تم المزامنة - ${updatedCount} طلب`,
      total: orders.length + abandonedOrders.length,
      updated: updatedCount,
      fetched: Object.keys(data).length,
      paidBatch: paidOrders.length > 0 ? `${paidOrders.length} طلب مدفوع` : null,
      details: Object.entries(statusBreakdown).filter(([_, count]) => count > 0).map(([status, count]) => ({ status, count })),
    });
  } catch (error) {
    console.error("DHD sync error:", error);
    return NextResponse.json({ error: "فشلت المزامنة" }, { status: 500 });
  }
}
