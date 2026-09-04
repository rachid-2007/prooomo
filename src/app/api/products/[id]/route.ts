import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { compressImages } from "@/lib/compress-image";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        offers: { orderBy: { sortOrder: "asc" } },
        colors: { orderBy: { sortOrder: "asc" } },
        sizes: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const response = NextResponse.json(product);
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      slug,
      shortDescription,
      fullDescription,
      price,
      images,
      isActive,
      variants,
      initialStock,
      hasOffers,
      hasColors,
      hasSizes,
    } = body;

    // Update product
    const compressed = images ? await compressImages(typeof images === "string" ? images : JSON.stringify(images)) : null;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(fullDescription !== undefined && { fullDescription }),
        ...(price !== undefined && { price }),
        ...(compressed && { images: compressed.images, thumbnail: compressed.thumbnail }),
        ...(isActive !== undefined && { isActive }),
        ...(initialStock !== undefined && { initialStock, stock: initialStock }),
        ...(hasOffers !== undefined && { hasOffers }),
        ...(hasColors !== undefined && { hasColors }),
        ...(hasSizes !== undefined && { hasSizes }),
      },
      include: {
        variants: true,
      },
    });

    // Update variants if provided
    if (variants) {
      // Delete existing variants
      await prisma.productVariant.deleteMany({
        where: { productId: id },
      });

      // Create new variants
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((v: { name: string; price: number; stock?: number }) => ({
            productId: id,
            name: v.name,
            price: v.price,
            stock: v.stock || 0,
          })),
        });
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
