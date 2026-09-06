import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { normalizePhone } from '@/lib/fraud';

function toOrderWithRelations(ao: any, productImageMap?: Map<string, string>) {
  const productImages = ao.productImages || "[]";
  let images = productImages;
  if ((!ao.productImages || ao.productImages === "[]" || ao.productImages === "") && productImageMap) {
    const dbImg = productImageMap.get(ao.productId);
    if (dbImg) images = dbImg;
  }

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
    notes: `طلب متروك - السبب: ${ao.reason === "timeout" ? "متروك (timeout)" : "غادر الصفحة"}`,
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
      images: images,
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

export async function GET() {
  try {
    const abandonedOrders = await prisma.abandonedOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // Fetch product images for abandoned orders that don't have them
    const productIds = [...new Set(abandonedOrders.filter(ao => !ao.productImages || ao.productImages === "[]" || ao.productImages === "").map(ao => ao.productId))];
    const productImageMap = new Map<string, string>();
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, images: true } });
      for (const p of products) { productImageMap.set(p.id, p.images || "[]"); }
    }
    return NextResponse.json(abandonedOrders.map(ao => toOrderWithRelations(ao, productImageMap)));
  } catch (error) {
    console.error('Error fetching abandoned orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch abandoned orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      productName,
      productImages,
      customerName,
      customerPhone,
      wilayaCode,
      wilayaName,
      baladyaName,
      quantity,
      productPrice,
      shippingPrice,
      totalPrice,
        offerId,
        offerName,
        reason,
        deliveryMethod,
        deviceId,
      } = body;

    if (!productId || !customerPhone) {
      return NextResponse.json(
        { error: 'productId and customerPhone are required' },
        { status: 400 }
      );
    }

    const abandonedOrder = await prisma.abandonedOrder.create({
      data: {
        productId,
        productName: productName || '',
        productImages: productImages || null,
          customerName: customerName || null,
          customerPhone: normalizePhone(customerPhone),
        wilayaCode: wilayaCode || null,
        wilayaName: wilayaName || null,
        baladyaName: baladyaName || null,
        deliveryMethod: deliveryMethod || null,
        quantity: quantity || 1,
        productPrice: productPrice || null,
        shippingPrice: shippingPrice || null,
        totalPrice: totalPrice || null,
          offerId: offerId || null,
          offerName: offerName || null,
          reason: reason || 'timeout',
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip")?.trim() || null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
          deviceId: deviceId || null,
        },
      });

    return NextResponse.json(abandonedOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating abandoned order:', error);
    return NextResponse.json(
      { error: 'Failed to create abandoned order' },
      { status: 500 }
    );
  }
}
