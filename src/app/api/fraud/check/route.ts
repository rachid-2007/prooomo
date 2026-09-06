import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../../push/auth";
import { normalizePhone } from "@/lib/fraud";

// GET /api/fraud/check?phone=&ip=&device=&excludeOrderId=
// Returns fraud signals for an order: counts per phone/IP/device + visits + block status
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
    const phone = normalizePhone(rawPhone);
    const ip = searchParams.get("ip") || "";
    const device = searchParams.get("device") || "";
    const excludeOrderId = searchParams.get("excludeOrderId") || undefined;
    const notExcluded = excludeOrderId ? { id: { not: excludeOrderId } } : {};

    const phoneWhere = phone ? { customerPhone: phone, ...notExcluded } : null;
    const blockConds = [
      phone ? { type: "phone", value: phone } : null,
      ip ? { type: "ip", value: ip } : null,
      device ? { type: "device", value: device } : null,
    ].filter(Boolean);

    const [
      ordersByPhone,
      cancelledByPhone,
      fakeByPhone,
      ordersByIp,
      ordersByDevice,
      abandonedByPhone,
      visitsByIp,
      blocksRaw,
    ] = await Promise.all([
      phoneWhere
        ? prisma.order.count({ where: phoneWhere })
        : 0,
      phoneWhere
        ? prisma.order.count({ where: { ...phoneWhere, status: { in: ["CANCELLED", "FAKE"] } } })
        : 0,
      phoneWhere
        ? prisma.order.count({ where: { ...phoneWhere, status: "FAKE" } })
        : 0,
      ip
        ? prisma.order.count({ where: { ipAddress: ip, ...notExcluded } })
        : 0,
      device
        ? prisma.order.count({ where: { deviceId: device, ...notExcluded } })
        : 0,
      phoneWhere
        ? prisma.abandonedOrder.count({ where: { customerPhone: phone } })
        : 0,
      ip
        ? prisma.productPageView.count({ where: { ip } })
        : 0,
      blockConds.length > 0
        ? prisma.blockedEntry.findMany({
            where: { OR: blockConds as { type: string; value: string }[] },
            select: { type: true, value: true, createdAt: true },
          })
        : [],
    ]);
    const blocks = blocksRaw as { type: string; value: string }[];

    const blocked = {
      phone: blocks.some((b) => b.type === "phone"),
      ip: blocks.some((b) => b.type === "ip"),
      device: blocks.some((b) => b.type === "device"),
    };

    // Simple risk score 0-100
    let risk = 0;
    if (ordersByPhone >= 4) risk += 30;
    else if (ordersByPhone >= 2) risk += 10;
    if (fakeByPhone > 0) risk += 40;
    else if (cancelledByPhone > 0) risk += 15;
    if (ordersByIp >= 5) risk += 20;
    else if (ordersByIp >= 3) risk += 10;
    if (ordersByDevice >= 3) risk += 15;
    if (blocked.phone || blocked.ip || blocked.device) risk = 100;
    risk = Math.min(100, risk);

    return NextResponse.json({
      ordersByPhone,
      cancelledByPhone,
      fakeByPhone,
      ordersByIp,
      ordersByDevice,
      abandonedByPhone,
      visitsByIp,
      blocked,
      risk,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
