import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser, unauthorized } from "../push/auth";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();
    // Add username column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
    `).catch(() => {});

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
      `);
    } catch {}

    // Create WorkerProduct table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WorkerProduct" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workerId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WorkerProduct_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "WorkerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `).catch(() => {});

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "WorkerProduct_workerId_productId_key" ON "WorkerProduct"("workerId", "productId");
      `);
    } catch {}

    // Update admin user with username if missing
    const firstAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (firstAdmin && !(firstAdmin as any).username) {
      await prisma.user.update({
        where: { id: firstAdmin.id },
        data: { username: "admin" } as any,
      });
    }

    return NextResponse.json({ success: true, message: "Migration completed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
