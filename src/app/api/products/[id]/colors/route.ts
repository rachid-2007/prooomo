import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const colors = await prisma.productColor.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(colors);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch colors" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { colors } = await request.json();

    if (!Array.isArray(colors)) {
      return NextResponse.json({ error: "colors array required" }, { status: 400 });
    }

    await prisma.productColor.deleteMany({ where: { productId: id } });

    if (colors.length > 0) {
      await prisma.productColor.createMany({
        data: colors.map((c: { name: string; image?: string; stock?: number; sortOrder?: number; isActive?: boolean }, i: number) => ({
          productId: id,
          name: c.name,
          image: c.image || "",
          stock: c.stock || 0,
          sortOrder: c.sortOrder ?? i,
          isActive: c.isActive ?? true,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save colors" }, { status: 500 });
  }
}
