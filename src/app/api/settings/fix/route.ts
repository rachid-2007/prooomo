import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const products = await prisma.product.findMany({ select: { id: true, name: true, slug: true } });
    let fixed = 0;
    const results: { id: string; name: string; oldSlug: string; newSlug: string }[] = [];
    
    for (const product of products) {
      let newSlug = product.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "-")
        .replace(/^-+|-+$/g, "");
      
      if (!newSlug) newSlug = `product-${Date.now()}`;
      
      let finalSlug = newSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.product.findUnique({ where: { slug: finalSlug } });
        if (!existing || existing.id === product.id) break;
        finalSlug = `${newSlug}-${counter}`;
        counter++;
      }
      
      if (finalSlug !== product.slug) {
        await prisma.product.update({
          where: { id: product.id },
          data: { slug: finalSlug },
        });
        results.push({ id: product.id, name: product.name, oldSlug: product.slug, newSlug: finalSlug });
        fixed++;
      }
    }

    return NextResponse.json({ ok: true, fixed, total: products.length, changes: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Assign FIFO purchase prices to all existing orders that have purchasePrice=0
export async function PUT() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        purchasePrice: 0,
        status: { not: "NEW" },
      },
      select: { id: true, productId: true, quantity: true, status: true },
    });

    let fixed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        const entries = await prisma.purchaseEntry.findMany({
          where: { productId: order.productId, remainingQty: { gt: 0 } },
          orderBy: { date: "asc" },
        });

        if (entries.length === 0) {
          skipped++;
          continue;
        }

        let remaining = order.quantity;
        let totalCost = 0;
        let totalQty = 0;
        for (const entry of entries) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, entry.remainingQty || 0);
          totalCost += take * (entry.unitPrice || 0);
          totalQty += take;
          remaining -= take;
        }

        if (totalQty > 0) {
          const avgCost = totalCost / totalQty;
          await prisma.order.update({
            where: { id: order.id },
            data: { purchasePrice: avgCost },
          });
          fixed++;
        }
      } catch (e: any) {
        errors.push(`${order.id}: ${e.message}`);
      }
    }

    return NextResponse.json({ ok: true, fixed, skipped, total: orders.length, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
