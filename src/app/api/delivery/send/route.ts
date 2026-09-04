import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const settingsRows = await prisma.settings.findMany({
      where: { key: { in: ["delivery_api_token", "delivery_api_url"] } },
    });
    const settings = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);

    if (!settings.delivery_api_token || !settings.delivery_api_url) {
      return NextResponse.json({ error: "إعدادات شركة الشحن غير مكتملة" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, wilaya: true, baladya: true },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (order.deliveryReference) {
      return NextResponse.json({ error: "تم إرسال هذا الطلب مسبقاً", reference: order.deliveryReference }, { status: 400 });
    }

    const isOffice = !!order.customerAddress && !order.baladyaId;

    let commune = "";
    if (isOffice) {
      commune = (order.customerAddress || "").replace(/^مكتب\s*/i, "").trim();
    } else if (order.baladya?.name) {
      commune = order.baladya.name;
    }

    const ordersPayload: Record<string, any> = {};
    ordersPayload["0"] = {
      reference: order.orderNumber,
      nom_client: order.customerName,
      telephone: order.customerPhone,
      telephone_2: "",
      adresse: `${order.wilaya?.name || ""}${commune ? ", " + commune : ""}`,
      code_postal: "",
      commune,
      code_wilaya: String(parseInt(order.wilaya?.code || "0")),
      montant: String(order.totalPrice),
      remarque: order.notes || "",
      produit: order.product?.name || "",
      type: "1",
      stop_desk: isOffice ? 1 : 0,
      weight: "2",
      fragile: 1,
      stock: 0,
    };

    const apiUrl = settings.delivery_api_url.replace(/\/$/, "");
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

    const result = data.results?.["0"];

    if (!result?.success || !result?.tracking) {
      return NextResponse.json({ error: result?.error || "لم يتم الحصول على رقم تتبع", details: data }, { status: 502 });
    }

    const trackingNumber = result.tracking;

    // FIFO: consume stock if not already shipped
    let purchasePrice = 0;
    let consumedEntries = null;

    if (order.status !== "SHIPPED" && order.productId) {
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

          purchasePrice = totalQty > 0 ? totalCost / totalQty : 0;
          consumedEntries = JSON.stringify(consumed);

          // Deduct remainingQty from purchase entries
          remaining = orderQty;
          for (const entry of entries) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, entry.remainingQty || 0);
            if (take > 0) {
              await prisma.purchaseEntry.update({
                where: { id: entry.id },
                data: { remainingQty: (entry.remainingQty || 0) - take },
              });
            }
            remaining -= take;
          }
        }
      } catch (stockError) {
        console.error("FIFO failed for order, shipping without stock deduction:", stockError);
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryReference: trackingNumber,
        shippingCompany: "DHD",
        status: "SHIPPED",
        ...(purchasePrice > 0 && { purchasePrice }),
        ...(consumedEntries && { consumedEntries }),
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        oldStatus: order.status,
        newStatus: "SHIPPED",
        note: `تم الإرسال لشركة DHD - رقم التتبع: ${trackingNumber}`,
      },
    });

    return NextResponse.json({ success: true, tracking: trackingNumber });
  } catch (error) {
    console.error("DHD send error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الإرسال" }, { status: 500 });
  }
}
