import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const RECOVERY_REMARK_LABELS: Record<string, string> = {
  client_injoignable: "عميل لا يتصل",
  client_non_serieux: "عميل غير جاد",
  annule_par_client: "ملغي من العميل",
  appel_rejete: "مكالمة مرفوضة",
  occupe: "مشغول",
};

function detectRecoveryType(remarkText: string): string | null {
  const lower = remarkText.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizedMap: [string, string][] = [
    ["client injoignable", "client_injoignable"],
    ["injoignable", "client_injoignable"],
    ["client non serieux", "client_non_serieux"],
    ["non serieux", "client_non_serieux"],
    ["annule par le client", "annule_par_client"],
    ["annule par client", "annule_par_client"],
    ["cancelled by client", "annule_par_client"],
    ["appel rejete", "appel_rejete"],
    ["appel refuse", "appel_rejete"],
    ["call rejected", "appel_rejete"],
    ["occupe", "occupe"],
    ["busy", "occupe"],
  ];
  for (const [key, value] of normalizedMap) {
    if (lower.includes(key)) return value;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const singleTracking = body.tracking as string | undefined;

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

    // Backfill: scan existing delivery_company remarks to set lastRemarkType for orders that don't have it
    const ordersWithoutRemarkType = await prisma.order.findMany({
      where: { lastRemarkType: null, deliveryReference: { not: null } },
      select: { id: true },
    });

    if (ordersWithoutRemarkType.length > 0) {
      const orderIds = ordersWithoutRemarkType.map((o) => o.id);
      const existingRemarks = await prisma.orderStatusHistory.findMany({
        where: { orderId: { in: orderIds }, changedBy: "delivery_company", note: { contains: "DHD_REMARK:" } },
        select: { orderId: true, note: true },
        orderBy: { createdAt: "desc" },
      });

      const seen = new Set<string>();
      for (const remark of existingRemarks) {
        if (seen.has(remark.orderId)) continue;
        seen.add(remark.orderId);
        const remarkText = remark.note?.replace("DHD_REMARK: ", "").split("\n")[0] || "";
        const recoveryType = detectRecoveryType(remarkText);
        if (recoveryType) {
          await prisma.order.update({
            where: { id: remark.orderId },
            data: { lastRemarkType: recoveryType },
          });
        }
      }
    }

    type TrackingEntry = { tracking: string; orderId: string; isAbandoned: boolean; status: string };
    let trackings: TrackingEntry[] = [];

    if (singleTracking) {
      const order = await prisma.order.findFirst({
        where: { deliveryReference: singleTracking },
        select: { id: true, deliveryReference: true, status: true },
      });
      if (order?.deliveryReference) {
        trackings.push({ tracking: order.deliveryReference, orderId: order.id, isAbandoned: false, status: order.status });
      } else {
        const abdOrder = await prisma.abandonedOrder.findFirst({
          where: { deliveryReference: singleTracking },
          select: { id: true, deliveryReference: true, status: true },
        });
        if (abdOrder?.deliveryReference) {
          trackings.push({ tracking: abdOrder.deliveryReference, orderId: abdOrder.id, isAbandoned: true, status: abdOrder.status });
        }
      }
    } else {
      const orders = await prisma.order.findMany({
        where: { deliveryReference: { not: null } },
        select: { id: true, deliveryReference: true, status: true },
      });
      const abandonedOrders = await prisma.abandonedOrder.findMany({
        where: { deliveryReference: { not: null } },
        select: { id: true, deliveryReference: true, status: true },
      });
      trackings = [
        ...orders.map((o) => ({ tracking: o.deliveryReference!, orderId: o.id, isAbandoned: false, status: o.status })),
        ...abandonedOrders.map((o) => ({ tracking: o.deliveryReference!, orderId: o.id, isAbandoned: true, status: o.status })),
      ];
    }

    if (trackings.length === 0) {
      return NextResponse.json({ message: "لا توجد طلبات برقم تتبع", newRemarks: 0 });
    }

    const allRemarksData: Record<string, any[]> = {};

    for (const t of trackings) {
      try {
        const url = `${apiUrl}/api/v1/get/maj?api_token=${encodeURIComponent(settings.delivery_api_token)}&tracking=${encodeURIComponent(t.tracking)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) continue;

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          allRemarksData[t.tracking] = data;
        }
      } catch (e) {
        console.error(`Failed to fetch remarks for ${t.tracking}:`, e);
      }
    }

    let newRemarksCount = 0;
    let recoveryDetected = 0;
    const remarksDetails: { tracking: string; count: number }[] = [];

    const existingHistory = await prisma.orderStatusHistory.findMany({
      where: { changedBy: "delivery_company" },
      select: { orderId: true, note: true },
    });
    const existingSet = new Set(
      existingHistory
        .filter((h) => h.note?.startsWith("DHD_REMARK:"))
        .map((h) => `${h.orderId}::${h.note?.split("\n")[0]}`)
    );

    for (const t of trackings) {
      const remarks = allRemarksData[t.tracking];
      if (!remarks || remarks.length === 0) continue;

      let orderNewCount = 0;
      let latestRecoveryType: string | null = null;

      for (const remark of remarks) {
        const remarkText = remark.remarque || "";
        if (!remarkText) continue;

        const station = remark.station || "";
        const livreur = remark.livreur || "";
        const createdAt = remark.created_at || "";

        const noteBase = `DHD_REMARK: ${remarkText}`;
        const lookupKey = `${t.orderId}::${noteBase}`;
        if (existingSet.has(lookupKey)) continue;

        const extraInfo = [station && `المحطة: ${station}`, livreur && `السائق: ${livreur}`, createdAt && `التاريخ: ${createdAt}`]
          .filter(Boolean)
          .join(" | ");

        const fullNote = extraInfo ? `${noteBase}\n${extraInfo}` : noteBase;

        if (!t.isAbandoned) {
          await prisma.orderStatusHistory.create({
            data: {
              orderId: t.orderId,
              oldStatus: null,
              newStatus: t.status,
              changedBy: "delivery_company",
              note: fullNote,
            },
          });

          const recoveryType = detectRecoveryType(remarkText);
          if (recoveryType) {
            latestRecoveryType = recoveryType;
          }
        }

        newRemarksCount++;
        orderNewCount++;
        existingSet.add(lookupKey);
      }

      if (!t.isAbandoned && latestRecoveryType) {
        await prisma.order.update({
          where: { id: t.orderId },
          data: { lastRemarkType: latestRecoveryType },
        });
        recoveryDetected++;
      }

      if (orderNewCount > 0) {
        remarksDetails.push({ tracking: t.tracking, count: orderNewCount });
      }
    }

    return NextResponse.json({
      message: `تم جلب ${newRemarksCount} ملاحظة جديدة`,
      newRemarks: newRemarksCount,
      recoveryDetected,
      details: remarksDetails,
    });
  } catch (error) {
    console.error("Delivery remarks error:", error);
    return NextResponse.json({ error: "فشل جلب الملاحظات" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tracking = req.nextUrl.searchParams.get("tracking");
    if (!tracking) {
      return NextResponse.json({ error: "missing tracking" }, { status: 400 });
    }

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
    const url = `${apiUrl}/api/v1/get/maj?api_token=${encodeURIComponent(settings.delivery_api_token)}&tracking=${encodeURIComponent(tracking)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `DHD API ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ remarks: [] });
    }

    const remarks = data
      .filter((r: any) => r.remarque)
      .map((r: any) => ({
        text: r.remarque || "",
        station: r.station || "",
        livreur: r.livreur || "",
        date: r.created_at || "",
      }));

    return NextResponse.json({ remarks });
  } catch (error) {
    console.error("Delivery remarks GET error:", error);
    return NextResponse.json({ error: "فشل جلب الملاحظات" }, { status: 500 });
  }
}
