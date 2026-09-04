import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DELIVERY_STATUSES = ["SHIPPED", "IN_DELIVERY", "ON_HOLD"];

export async function POST() {
  try {
    const settingsRows = await prisma.settings.findMany({
      where: { key: { in: ["delivery_api_token", "delivery_api_url"] } },
    });
    const settings = settingsRows.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>
    );

    if (!settings.delivery_api_token || !settings.delivery_api_url) {
      return NextResponse.json({ error: "إعدادات شركة الشحن غير مكتملة" }, { status: 400 });
    }

    const apiUrl = settings.delivery_api_url.replace(/\/$/, "");

    const deliveryOrders = await prisma.order.findMany({
      where: {
        deliveryReference: { not: null },
        status: { in: DELIVERY_STATUSES },
      },
      select: { id: true, deliveryReference: true },
    });

    if (deliveryOrders.length === 0) {
      return NextResponse.json({ message: "لا طلبات قيد التوصيل", remarksFetched: 0 });
    }

    let remarksFetched = 0;

    for (const order of deliveryOrders) {
      if (!order.deliveryReference) continue;
      try {
        const url = `${apiUrl}/api/v1/get/maj?api_token=${encodeURIComponent(settings.delivery_api_token)}&tracking=${encodeURIComponent(order.deliveryReference)}`;
        const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        if (!res.ok) continue;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) continue;

        for (const remark of data) {
          const remarkText = remark.remarque || "";
          if (!remarkText) continue;

          const existing = await prisma.orderStatusHistory.findFirst({
            where: {
              orderId: order.id,
              changedBy: "delivery_company",
              note: { startsWith: `DHD_REMARK: ${remarkText}` },
            },
          });

          if (!existing) {
            const station = remark.station || "";
            const livreur = remark.livreur || "";
            const date = remark.date || "";
            await prisma.orderStatusHistory.create({
              data: {
                orderId: order.id,
                oldStatus: null,
                newStatus: order.id,
                changedBy: "delivery_company",
                note: `DHD_REMARK: ${remarkText}\nالمحطة: ${station} | السائق: ${livreur} | التاريخ: ${date}`,
              },
            });
          }
        }

        remarksFetched++;
      } catch (e) {
        console.error(`Remarks fetch failed for ${order.deliveryReference}:`, e);
      }
    }

    return NextResponse.json({
      message: `تم - ${remarksFetched} ملاحظة`,
      remarksFetched,
    });
  } catch (error) {
    console.error("Remarks fetch error:", error);
    return NextResponse.json({ error: "فشل" }, { status: 500 });
  }
}
