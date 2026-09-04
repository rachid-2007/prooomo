import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        fullDescription: true,
        price: true,
        initialStock: true,
        hasOffers: true,
        hasColors: true,
        hasSizes: true,
        isActive: true,
        offers: { orderBy: { sortOrder: "asc" } },
        colors: { orderBy: { sortOrder: "asc" } },
        sizes: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const response = NextResponse.json(product);
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
