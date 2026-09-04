import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sizes = await prisma.productSize.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(sizes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sizes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sizes } = await request.json();

    if (!Array.isArray(sizes)) {
      return NextResponse.json({ error: "sizes array required" }, { status: 400 });
    }

    await prisma.productSize.deleteMany({ where: { productId: id } });

    if (sizes.length > 0) {
      await prisma.productSize.createMany({
        data: sizes.map((s: { name: string; stock?: number; sortOrder?: number; isActive?: boolean }, i: number) => ({
          productId: id,
          name: s.name,
          stock: s.stock || 0,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive ?? true,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save sizes" }, { status: 500 });
  }
}
