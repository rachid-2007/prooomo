import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");

    if (isPostgres) {
      try {
        const entries = await prisma.$queryRawUnsafe(`
          SELECT pe.id, pe.reference, pe.date, pe.supplier, pe.total, pe.note,
                 pe."productId", pe.quantity, pe."unitPrice", pe."remainingQty", pe."createdAt",
                 COALESCE(p.name, 'Unknown') as "productName"
          FROM "PurchaseEntry" pe
          LEFT JOIN "Product" p ON pe."productId" = p."id"
          ORDER BY pe."date" DESC
        `);
        return NextResponse.json(entries || []);
      } catch (e: any) {
        console.error("Purchase entries GET error:", e.message);
        return NextResponse.json([]);
      }
    }

    const entries = await prisma.purchaseEntry.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(entries.map((e: any) => ({ ...e, productName: e.product?.name || "Unknown" })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, supplier, total, quantity, unitPrice, note, colorId, sizeId } = body;

    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");
    const id = `pe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ref = `PUR-${Date.now()}`;
    const totalVal = total || quantity * unitPrice;
    const now = new Date().toISOString();

    if (isPostgres) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "PurchaseEntry" ("id", "reference", "date", "supplier", "total", "note", "productId", "quantity", "unitPrice", "remainingQty", "colorId", "sizeId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, id, ref, now, supplier || null, totalVal, note || null, productId, quantity, unitPrice, quantity, colorId || null, sizeId || null, now);
    } else {
      await prisma.purchaseEntry.create({
        data: {
          reference: ref, productId, supplier: supplier || null,
          total: totalVal, quantity, unitPrice, remainingQty: quantity, note: note || null,
          colorId: colorId || null, sizeId: sizeId || null,
        },
      });
    }

    await prisma.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } });

    // Increment color/size stock if specified
    if (colorId) {
      try { await prisma.productColor.update({ where: { id: colorId }, data: { stock: { increment: quantity } } }); } catch {}
    }
    if (sizeId) {
      try { await prisma.productSize.update({ where: { id: sizeId }, data: { stock: { increment: quantity } } }); } catch {}
    }

    return NextResponse.json({ id, reference: ref, productId, quantity, unitPrice, total: totalVal });
  } catch (error: any) {
    console.error("Purchase entry POST error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");

    if (isPostgres) {
      // Get entry first to restore stock
      const entries: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "PurchaseEntry" WHERE "id" = $1`, id);
      if (entries.length > 0) {
        const entry = entries[0];
        if (entry.productId) {
          await prisma.product.update({ where: { id: entry.productId }, data: { stock: { decrement: entry.quantity || 0 } } });
        }
        if (entry.colorId) {
          try { await prisma.productColor.update({ where: { id: entry.colorId }, data: { stock: { decrement: entry.quantity || 0 } } }); } catch {}
        }
        if (entry.sizeId) {
          try { await prisma.productSize.update({ where: { id: entry.sizeId }, data: { stock: { decrement: entry.quantity || 0 } } }); } catch {}
        }
        await prisma.$executeRawUnsafe(`DELETE FROM "PurchaseEntry" WHERE "id" = $1`, id);
      }
    } else {
      const entry = await prisma.purchaseEntry.findUnique({ where: { id } });
      if (entry?.productId) {
        await prisma.product.update({ where: { id: entry.productId }, data: { stock: { decrement: entry.quantity || 0 } } });
      }
      if (entry?.colorId) {
        try { await prisma.productColor.update({ where: { id: entry.colorId }, data: { stock: { decrement: entry.quantity || 0 } } }); } catch {}
      }
      if (entry?.sizeId) {
        try { await prisma.productSize.update({ where: { id: entry.sizeId }, data: { stock: { decrement: entry.quantity || 0 } } }); } catch {}
      }
      await prisma.purchaseEntry.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
