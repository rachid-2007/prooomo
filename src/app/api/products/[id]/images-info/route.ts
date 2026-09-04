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
      select: { images: true, thumbnail: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let images: string[] = [];
    try {
      images = JSON.parse(product.images || "[]");
    } catch {}

    const response = NextResponse.json({
      thumbnail: product.thumbnail || (images.length > 0 ? images[0] : ""),
      imageCount: images.length,
    });
    response.headers.set("Cache-Control", "private, max-age=300");
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
