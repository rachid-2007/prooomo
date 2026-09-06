import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendTelegramMessage, formatOrderNotification } from "@/lib/telegram";
import { sendNewOrderPush } from "@/lib/push";
import { getClientIp, findBlock, checkRateLimit, normalizePhone } from "@/lib/fraud";

function getDateRange(time: string, dateFrom?: string, dateTo?: string): { gte?: Date; lte?: Date } | undefined {
  const now = new Date();

  if (dateFrom || dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
    return range;
  }

  switch (time) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    case "yesterday": {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    case "7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    }
    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: now };
    }
    case "all":
    default:
      return undefined;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const time = searchParams.get("time") || "all";
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const product = searchParams.get("product") || undefined;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const dateRange = getDateRange(time, dateFrom, dateTo);

    const where: Record<string, any> = {};
    if (dateRange) where.createdAt = dateRange;
    if (product) where.productId = product;
    if (status) {
      const statusList = status.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else {
        where.status = { in: statusList };
      }
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { orderNumber: { contains: search } },
        { deliveryReference: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, slug: true, price: true, images: true },
          },
          variant: {
            select: { id: true, name: true, price: true },
          },
          wilaya: {
            select: { id: true, name: true, code: true },
          },
          baladya: {
            select: { id: true, name: true, arabicName: true },
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, images: true },
              },
              color: {
                select: { id: true, name: true, image: true },
              },
              size: {
                select: { id: true, name: true },
              },
            },
          },
          statusHistory: {
            where: {
              OR: [
                { changedBy: "delivery_company" },
                { newStatus: { in: ["RETURN_TRANSFER", "RETURN_READY"] } },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      variantId,
      offerId,
      colorId,
      sizeId,
      customerName,
      customerPhone,
      customerAddress,
      wilayaId,
      baladyaId,
      quantity,
      productPrice,
      shippingPrice,
      notes,
      deviceId,
    } = body;

    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

    // Admin-created orders (quick order form) bypass anti-fake checks
    let isAdmin = false;
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");
      const token = request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];
      if (token) {
        const { payload } = await jwtVerify(token, secret);
        isAdmin = payload.role === "ADMIN";
      }
    } catch { /* not admin */ }

    if (!isAdmin) {
      // Anti-fake: blocked phone / IP / device
      const block = await findBlock(customerPhone, clientIp, deviceId || null);
      if (block) {
        return NextResponse.json(
          { error: "تعذر إتمام الطلب، يرجى الاتصال بخدمة الزبائن" },
          { status: 403 }
        );
      }

      // Anti-fake: rate limits
      const limit = await checkRateLimit(customerPhone, clientIp);
      if (!limit.allowed) {
        return NextResponse.json({ error: limit.reason }, { status: 429 });
      }
    }

    // Get next order number - find the highest existing number to avoid collisions
    const lastOrders = await prisma.$queryRaw<[{ max_num: bigint }]>`
      SELECT COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM 6) AS INTEGER)), 0) as max_num
      FROM "Order"
      WHERE "orderNumber" LIKE 'MEGA-%'
    `;
    const lastNum = Number(lastOrders[0]?.max_num || 0);
    const orderNumber = `MEGA-${String(lastNum + 1).padStart(6, "0")}`;
    const totalPrice = productPrice * (quantity || 1) + (shippingPrice || 0);

    // Resolve wilayaId - if it looks like a code (short string, not cuid), find the actual ID
    let resolvedWilayaId = wilayaId;
    if (wilayaId && wilayaId.length < 20 && !wilayaId.startsWith("c")) {
      const wilayaRecord = await prisma.wilaya.findFirst({ where: { code: wilayaId }, select: { id: true } });
      if (wilayaRecord) resolvedWilayaId = wilayaRecord.id;
    }

    // Validate that we have a valid wilaya
    if (!resolvedWilayaId) {
      return NextResponse.json({ error: "ولاية غير صالحة" }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        productId,
        variantId: variantId || null,
        offerId: offerId || null,
        customerName,
        customerPhone: normalizePhone(customerPhone),
        customerAddress: customerAddress || null,
        wilayaId: resolvedWilayaId,
        baladyaId: baladyaId || null,
        quantity: quantity || 1,
        productPrice,
        shippingPrice: shippingPrice || 0,
        totalPrice,
        notes: notes || null,
        ipAddress: clientIp,
        userAgent,
        deviceId: deviceId || null,
        statusHistory: {
          create: {
            newStatus: "NEW",
            note: "تم إنشاء الطلب",
          },
        },
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true, price: true, images: true },
        },
        variant: {
          select: { id: true, name: true, price: true },
        },
        wilaya: {
          select: { id: true, name: true, code: true },
        },
        baladya: {
          select: { id: true, name: true, arabicName: true },
        },
        statusHistory: true,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { orderCount: { increment: 1 } },
    });

    // Create OrderItem with color/size info
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        quantity: quantity || 1,
        productPrice,
        purchasePrice: 0,
        offerId: offerId || null,
        colorId: colorId || null,
        sizeId: sizeId || null,
      },
    });

    // Send Telegram notification
    try {
      const telegramText = formatOrderNotification({
        orderNumber,
        customerName,
        customerPhone,
        productName: order.product?.name || "غير معروف",
        quantity: order.quantity,
        totalPrice,
        shippingMethod: order.customerAddress && !baladyaId ? "home" : "office",
        wilaya: order.wilaya?.name || String(wilayaId),
        baladya: order.baladya?.arabicName,
        officeName: order.customerAddress && !baladyaId ? null : order.customerAddress,
        address: order.customerAddress && !baladyaId ? order.customerAddress : null,
        status: "جديد",
      });
      await sendTelegramMessage(telegramText);
    } catch (e) {
      console.error("Telegram notification failed:", e);
    }

    // Send Web Push notification to subscribed devices (phones even when site closed)
    try {
      const { sent } = await sendNewOrderPush({
        orderId: order.id,
        orderNumber,
        productName: order.product?.name || "غير معروف",
        customerName,
        totalPrice,
      });
      if (sent > 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { pushNotifiedAt: new Date() },
        });
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create order", details: error?.meta || null },
      { status: 500 }
    );
  }
}
