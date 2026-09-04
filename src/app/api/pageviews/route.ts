import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    await prisma.productPageView.create({
      data: { productId, ip, userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Page view error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
