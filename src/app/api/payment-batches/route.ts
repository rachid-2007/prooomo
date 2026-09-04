import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");

    if (isPostgres) {
      const batches = await prisma.$queryRawUnsafe(`
        SELECT * FROM "PaymentBatch" ORDER BY "batchNumber" DESC LIMIT 50
      `);
      return NextResponse.json(batches || []);
    }

    const batches = await prisma.paymentBatch.findMany({
      orderBy: { paidAt: "desc" },
      take: 50,
    });
    return NextResponse.json(batches);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderIds, note } = body;

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: "No orders" }, { status: 400 });
    }

    // Get orders info
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        productPrice: true,
        quantity: true,
        productId: true,
        product: { select: { name: true } },
      },
    });

    const totalAmount = orders.reduce((sum, o) => sum + (o.productPrice || 0) * o.quantity, 0);
    const orderCount = orders.length;

    // Build product summary and details
    const productMap: Record<string, { name: string; qty: number; total: number; count: number }> = {};
    for (const o of orders) {
      const name = o.product?.name || "Unknown";
      if (!productMap[o.productId]) productMap[o.productId] = { name, qty: 0, total: 0, count: 0 };
      productMap[o.productId].qty += o.quantity;
      productMap[o.productId].total += (o.productPrice || 0) * o.quantity;
      productMap[o.productId].count += 1;
    }
    const productSummary = Object.values(productMap)
      .map((p) => `${p.name}(${p.qty})`)
      .join(" + ");

    const productDetails = Object.values(productMap).map((p) => ({
      name: p.name,
      quantity: p.qty,
      orderCount: p.count,
      total: p.total,
    }));

    // Get next batch number
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");
    let nextBatchNumber = 1;
    if (isPostgres) {
      const result = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX("batchNumber"), 0) + 1 as next FROM "PaymentBatch"`) as any[];
      nextBatchNumber = Number(result[0]?.next || 1);
    } else {
      const last = await prisma.paymentBatch.findFirst({ orderBy: { batchNumber: "desc" }, select: { batchNumber: true } });
      nextBatchNumber = (last?.batchNumber || 0) + 1;
    }

    const id = `pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (isPostgres) {
      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe(`
        INSERT INTO "PaymentBatch" ("id", "batchNumber", "totalAmount", "orderCount", "productSummary", "productDetails", "paidAt", "note", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, id, nextBatchNumber, totalAmount, orderCount, productSummary, JSON.stringify(productDetails), now, note || null, now);

      return NextResponse.json({ id, batchNumber: nextBatchNumber, totalAmount, orderCount, productSummary, productDetails, paidAt: now });
    }

    const batch = await prisma.paymentBatch.create({
      data: {
        batchNumber: nextBatchNumber,
        totalAmount,
        orderCount,
        productSummary,
        productDetails: JSON.stringify(productDetails),
        note: note || null,
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    console.error("Payment batch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");
    if (isPostgres) {
      await prisma.$executeRawUnsafe(`DELETE FROM "PaymentBatch" WHERE "id" = $1`, id);
    } else {
      await prisma.paymentBatch.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete batch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
