import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    return NextResponse.json({ worker, orders });
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

    const { orderId, status } = await request.json();

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
