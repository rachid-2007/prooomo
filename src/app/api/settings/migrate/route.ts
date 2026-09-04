import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const results: string[] = [];

    // Try each ALTER individually
    const sqls = [
      `ALTER TABLE "PurchaseEntry" ADD COLUMN IF NOT EXISTS "remainingQty" INTEGER`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "consumedEntries" TEXT`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryReference" TEXT`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCompany" TEXT`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "initialStock" INTEGER NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS "FacebookEvent" (
        "id" TEXT NOT NULL, "eventName" TEXT NOT NULL, "eventId" TEXT,
        "eventData" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'pixel',
        "status" TEXT NOT NULL DEFAULT 'pending', "error" TEXT, "response" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FacebookEvent_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT NOT NULL, "description" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL,
        "category" TEXT, "productId" TEXT, "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "PaymentBatch" (
        "id" TEXT NOT NULL, "totalAmount" DOUBLE PRECISION NOT NULL,
        "orderCount" INTEGER NOT NULL, "productSummary" TEXT NOT NULL,
        "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "PurchaseEntry_productId_idx" ON "PurchaseEntry"("productId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseEntry_date_idx" ON "PurchaseEntry"("date")`,
      `CREATE INDEX IF NOT EXISTS "FacebookEvent_eventName_idx" ON "FacebookEvent"("eventName")`,
      `CREATE INDEX IF NOT EXISTS "FacebookEvent_status_idx" ON "FacebookEvent"("status")`,
      `CREATE INDEX IF NOT EXISTS "FacebookEvent_createdAt_idx" ON "FacebookEvent"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "FacebookEvent_source_idx" ON "FacebookEvent"("source")`,
      `CREATE INDEX IF NOT EXISTS "Expense_productId_idx" ON "Expense"("productId")`,
      `CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date")`,
      `CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category")`,
      `CREATE INDEX IF NOT EXISTS "PaymentBatch_paidAt_idx" ON "PaymentBatch"("paidAt")`,
      `CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`,
      `CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "Order_productId_idx" ON "Order"("productId")`,
      `CREATE INDEX IF NOT EXISTS "Order_wilayaId_idx" ON "Order"("wilayaId")`,
      `CREATE INDEX IF NOT EXISTS "Order_baladyaId_idx" ON "Order"("baladyaId")`,
      `CREATE INDEX IF NOT EXISTS "Order_customerPhone_idx" ON "Order"("customerPhone")`,
      `CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber")`,
    ];

    for (const sql of sqls) {
      try {
        await prisma.$executeRawUnsafe(sql);
        results.push(`OK: ${sql.substring(0, 60)}...`);
      } catch (e: any) {
        results.push(`SKIP: ${sql.substring(0, 60)}... (${e.message?.substring(0, 50)})`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
