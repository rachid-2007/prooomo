import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function toAbandonedOrderWithRelations(ao: any) {
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
    purchasePrice: ao.purchasePrice || 0,
    status: ao.status || "NEW",
    attemptCount: 0,
    notes: ao.notes || `طلب متروك - السبب: ${ao.reason === "timeout" ? "متروك (timeout)" : "غادر الصفحة"}`,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const worker = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true, isActive: true },
    });

    if (!worker || !worker.isActive) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const assignedProducts = await prisma.workerProduct.findMany({
      where: { workerId: worker.id },
      select: { productId: true },
    });

    const productIds = assignedProducts.map((p) => p.productId);

    const where = productIds.length > 0
      ? { productId: { in: productIds } }
      : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            fullDescription: true,
            price: true,
            images: true,
            orderCount: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        variant: {
          select: { id: true, name: true, price: true, stock: true },
        },
        wilaya: {
          select: { id: true, name: true, code: true },
        },
        baladya: {
          select: { id: true, name: true, arabicName: true, wilayaId: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch abandoned orders for assigned products
    const abandonedWhere = productIds.length > 0
      ? { productId: { in: productIds } }
      : {};

    const abandonedOrders = await prisma.abandonedOrder.findMany({
      where: abandonedWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      worker,
      orders,
      abandonedOrders: abandonedOrders.map(toAbandonedOrderWithRelations),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const worker = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const { orderId, status, isAbandoned } = await request.json();

    if (isAbandoned) {
      const existing = await prisma.abandonedOrder.findUnique({ where: { id: orderId } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await prisma.abandonedOrder.update({ where: { id: orderId }, data: { status } });
      // Record in statusHistory
      try {
        const history: any[] = JSON.parse(existing.statusHistory || "[]");
        history.unshift({
          id: `sh_${Date.now()}`,
          oldStatus: existing.status,
          newStatus: status,
          changedBy: username,
          note: null,
          createdAt: new Date().toISOString(),
        });
        await prisma.abandonedOrder.update({ where: { id: orderId }, data: { statusHistory: JSON.stringify(history) } });
      } catch {}
      return NextResponse.json({ success: true });
    }

    const oldOrder = await prisma.order.findUnique({ where: { id: orderId } });

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: oldOrder?.status || null,
        newStatus: status,
        changedBy: username,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
