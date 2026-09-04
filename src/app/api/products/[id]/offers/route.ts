import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const offers = await prisma.productOffer.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(offers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { offers } = await request.json();

    if (!Array.isArray(offers)) {
      return NextResponse.json({ error: "offers array required" }, { status: 400 });
    }

    await prisma.productOffer.deleteMany({ where: { productId: id } });

    if (offers.length > 0) {
      await prisma.productOffer.createMany({
        data: offers.map((o: { name: string; quantity: number; price: number; sortOrder?: number; isActive?: boolean }, i: number) => ({
          productId: id,
          name: o.name,
          quantity: o.quantity,
          price: o.price,
          sortOrder: o.sortOrder ?? i,
          isActive: o.isActive ?? true,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save offers" }, { status: 500 });
  }
}
