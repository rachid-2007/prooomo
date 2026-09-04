import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AbandonedOrder" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT`
    );
    return NextResponse.json({ success: true, message: "deliveryMethod column added" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}
