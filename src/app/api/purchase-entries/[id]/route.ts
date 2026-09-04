import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { supplier, quantity, unitPrice, note, total } = body;

    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgresql");
    const totalVal = total || (quantity && unitPrice ? quantity * unitPrice : undefined);

    if (isPostgres) {
      // Get old entry to adjust stock
      const oldEntries: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "PurchaseEntry" WHERE "id" = $1`, id);
      if (oldEntries.length > 0) {
        const old = oldEntries[0];
        const newQty = quantity ?? old.quantity;
        const diff = newQty - (old.quantity || 0);
        if (diff !== 0 && old.productId) {
          await prisma.product.update({ where: { id: old.productId }, data: { stock: { increment: diff } } });
        }
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (supplier !== undefined) { updates.push(`"supplier" = $${idx}`); values.push(supplier || null); idx++; }
      if (quantity !== undefined) { updates.push(`"quantity" = $${idx}`); values.push(quantity); idx++; }
      if (unitPrice !== undefined) { updates.push(`"unitPrice" = $${idx}`); values.push(unitPrice); idx++; }
      if (totalVal !== undefined) { updates.push(`"total" = $${idx}`); values.push(totalVal); idx++; }
      if (note !== undefined) { updates.push(`"note" = $${idx}`); values.push(note || null); idx++; }
      if (quantity !== undefined) { updates.push(`"remainingQty" = $${idx}`); values.push(quantity); idx++; }

      if (updates.length > 0) {
        values.push(id);
        await prisma.$executeRawUnsafe(`UPDATE "PurchaseEntry" SET ${updates.join(", ")} WHERE "id" = $${idx}`, ...values);
      }
    } else {
      const old = await prisma.purchaseEntry.findUnique({ where: { id } });
      const newQty = quantity ?? old?.quantity ?? 0;
      const diff = newQty - (old?.quantity || 0);
      if (diff !== 0 && old?.productId) {
        await prisma.product.update({ where: { id: old.productId }, data: { stock: { increment: diff } } });
      }
      await prisma.purchaseEntry.update({
        where: { id },
        data: {
          ...(supplier !== undefined && { supplier: supplier || null }),
          ...(quantity !== undefined && { quantity, remainingQty: quantity }),
          ...(unitPrice !== undefined && { unitPrice }),
          ...(totalVal !== undefined && { total: totalVal }),
          ...(note !== undefined && { note: note || null }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
