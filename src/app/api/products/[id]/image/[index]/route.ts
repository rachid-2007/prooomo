import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import sharp from "sharp";

const cache = new Map<string, { data: Buffer; contentType: string }>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index } = await params;
    const idx = parseInt(index) || 0;
    const size = parseInt(request.nextUrl.searchParams.get("size") || "200");
    const cacheKey = `${id}-${idx}-${size}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.data), {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { images: true },
    });

    if (!product) {
      return new NextResponse("Not found", { status: 404 });
    }

    let images: string[];
    try {
      images = JSON.parse(product.images || "[]");
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }

    if (!Array.isArray(images) || idx >= images.length) {
      return new NextResponse("Not found", { status: 404 });
    }

    const img = images[idx];
    if (!img.startsWith("data:image/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse("Not found", { status: 404 });
    }

    const buffer = Buffer.from(matches[2], "base64");
    const webpBuffer = await sharp(buffer)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    cache.set(cacheKey, { data: webpBuffer, contentType: "image/webp" });

    return new NextResponse(new Uint8Array(webpBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
