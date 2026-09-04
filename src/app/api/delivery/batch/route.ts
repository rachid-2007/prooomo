import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds array is required" }, { status: 400 });
    }

    const settingsRows = await prisma.settings.findMany({
      where: { key: { in: ["delivery_api_token", "delivery_api_url"] } },
    });
    const settings = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);

    if (!settings.delivery_api_token || !settings.delivery_api_url) {
      return NextResponse.json({ error: "إعدادات شركة الشحن غير مكتملة" }, { status: 400 });
    }

    const regularOrders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { product: true, wilaya: true, baladya: true },
    });

    const foundIds = new Set(regularOrders.map((o) => o.id));
    const missingIds = orderIds.filter((id: string) => !foundIds.has(id));

    const allOrders: (typeof regularOrders)[number][] = [...regularOrders];
    const abandonedIds: string[] = [];
    const abandonedOrderNumbers = new Map<string, string>();

    if (missingIds.length > 0) {
      const abandonedOrders = await prisma.abandonedOrder.findMany({
        where: { id: { in: missingIds } },
      });

      const createPromises = abandonedOrders.map(async (ao) => {
        const wilaya = ao.wilayaCode ? await prisma.wilaya.findFirst({ where: { code: ao.wilayaCode } }) : null;
        const orderNumber = `AB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const newOrder = await prisma.order.create({
          data: {
            orderNumber,
            productId: ao.productId,
            customerName: ao.customerName || "عميل",
            customerPhone: ao.customerPhone,
            wilayaId: wilaya?.id || ao.wilayaCode || "",
            baladyaId: null,
            customerAddress: ao.baladyaName || null,
            quantity: ao.quantity,
            productPrice: ao.productPrice || 0,
            shippingPrice: ao.shippingPrice || 0,
            totalPrice: ao.totalPrice || 0,
            offerId: ao.offerId || null,
            status: "CONFIRMED",
            notes: null,
          },
          include: { product: true, wilaya: true, baladya: true },
        });

        return { newOrder, abandonedId: ao.id, orderNumber };
      });

      const created = await Promise.all(createPromises);
      for (const { newOrder, abandonedId, orderNumber } of created) {
        allOrders.push(newOrder);
        abandonedIds.push(abandonedId);
        abandonedOrderNumbers.set(newOrder.id, abandonedId);
      }
    }

    if (allOrders.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, results: [] });
    }

    const apiUrl = settings.delivery_api_url.replace(/\/$/, "");

    const ordersPayload: Record<string, any> = {};
    const skippedOrders: { reference: string; error: string }[] = [];

    allOrders.forEach((order, index) => {
      const isOffice = !!order.customerAddress && !order.baladyaId;

      let commune = "";
      if (isOffice) {
        commune = (order.customerAddress || "").replace(/^مكتب\s*/i, "").trim();
      } else if (order.baladya?.name) {
        commune = order.baladya.name;
      }

      if (!commune) {
        skippedOrders.push({ reference: order.orderNumber, error: "missing_commune" });
        return;
      }

      ordersPayload[String(order.orderNumber)] = {
        reference: order.orderNumber,
        nom_client: order.customerName,
        telephone: order.customerPhone,
        telephone_2: "",
        adresse: `${order.wilaya?.name || ""}${commune ? ", " + commune : ""}`,
        code_postal: "",
        commune,
        code_wilaya: String(parseInt(order.wilaya?.code || order.wilayaId || "0")),
        montant: String(order.totalPrice),
        remarque: order.notes || "",
        produit: order.product?.name || "",
        type: "1",
        stop_desk: isOffice ? 1 : 0,
        weight: "2",
        fragile: 1,
        stock: 0,
      };
    });

    const res = await fetch(`${apiUrl}/api/v1/create/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.delivery_api_token}`,
      },
      body: JSON.stringify({ orders: ordersPayload }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || `فشل الإرسال: ${res.status}`, details: data }, { status: 502 });
    }

    const results: { reference: string; success: boolean; tracking?: string; error?: string }[] = [];
    const shippedUpdates: { id: string; tracking: string }[] = [];
    const historyCreates: { orderId: string; oldStatus: string; tracking: string }[] = [];
    const abandonedUpdates: { id: string; tracking: string }[] = [];

    const sentOrderNumbers = new Set(Object.keys(ordersPayload));
    const ordersToSend = allOrders.filter((o) => sentOrderNumbers.has(o.orderNumber));

    if (ordersToSend.length === 0) {
      return NextResponse.json({ sent: 0, failed: skippedOrders.length, results: skippedOrders.map((s) => ({ reference: s.reference, success: false, error: s.error })) });
    }

    for (const order of ordersToSend) {
      const result = data.results?.[order.orderNumber];

      if (result?.success && result?.tracking) {
        shippedUpdates.push({ id: order.id, tracking: result.tracking });
        historyCreates.push({ orderId: order.id, oldStatus: order.status, tracking: result.tracking });

        if (abandonedOrderNumbers.has(order.id)) {
          abandonedUpdates.push({ id: abandonedOrderNumbers.get(order.id)!, tracking: result.tracking });
        }

        results.push({ reference: order.orderNumber, success: true, tracking: result.tracking });
      } else {
        const errorMsg = JSON.stringify(result ?? data) || "فشل - لا يوجد استجابة";
        results.push({ reference: order.orderNumber, success: false, error: errorMsg });
      }
    }

    // Delete failed orders that were converted from abandoned (they should stay abandoned)
    const failedAbandonedOrders = results
      .filter((r) => !r.success)
      .map((r) => allOrders.find((o) => o.orderNumber === r.reference))
      .filter((o): o is NonNullable<typeof o> => !!o && abandonedOrderNumbers.has(o.id));

    if (failedAbandonedOrders.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: failedAbandonedOrders.map((o) => o.id) } },
      });
    }

    const updatePromises: Promise<any>[] = [];

    // FIFO: consume stock for each shipped order
    for (const u of shippedUpdates) {
      const order = allOrders.find((o) => o.id === u.id);
      if (!order || !order.productId) continue;

      const orderQty = order.quantity || 1;

      try {
        const entries = await prisma.purchaseEntry.findMany({
          where: { productId: order.productId, remainingQty: { gt: 0 } },
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

          const avgCost = totalQty > 0 ? totalCost / totalQty : 0;

          // Update order with FIFO data
          updatePromises.push(
            prisma.order.update({
              where: { id: u.id },
              data: {
                deliveryReference: u.tracking,
                shippingCompany: "DHD",
                status: "SHIPPED",
                purchasePrice: avgCost,
                consumedEntries: JSON.stringify(consumed),
              },
            })
          );

          // Deduct remainingQty from purchase entries
          remaining = orderQty;
          for (const entry of entries) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, entry.remainingQty || 0);
            if (take > 0) {
              updatePromises.push(
                prisma.purchaseEntry.update({
                  where: { id: entry.id },
                  data: { remainingQty: (entry.remainingQty || 0) - take },
                })
              );
            }
            remaining -= take;
          }
        } else {
          // No entries available, just update status
          updatePromises.push(
            prisma.order.update({
              where: { id: u.id },
              data: { deliveryReference: u.tracking, shippingCompany: "DHD", status: "SHIPPED" },
            })
          );
        }
      } catch (stockError) {
        console.error(`FIFO failed for order ${u.id}, shipping without stock deduction:`, stockError);
        updatePromises.push(
          prisma.order.update({
            where: { id: u.id },
            data: { deliveryReference: u.tracking, shippingCompany: "DHD", status: "SHIPPED" },
          })
        );
      }
    }

    if (historyCreates.length > 0) {
      updatePromises.push(
        prisma.orderStatusHistory.createMany({
          data: historyCreates.map((h) => ({
            orderId: h.orderId,
            oldStatus: h.oldStatus,
            newStatus: "SHIPPED",
            note: `إرسال جماعي - رقم التتبع: ${h.tracking}`,
          })),
        })
      );
    }

    if (abandonedUpdates.length > 0) {
      updatePromises.push(
        ...abandonedUpdates.map((u) =>
          prisma.abandonedOrder.update({
            where: { id: u.id },
            data: { deliveryReference: u.tracking, shippingCompany: "DHD", status: "SHIPPED" },
          })
        )
      );
    }

    await Promise.all(updatePromises);

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({ sent: sentCount, failed: failedCount, results });
  } catch (error) {
    console.error("DHD batch error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء الإرسال" }, { status: 500 });
  }
}
