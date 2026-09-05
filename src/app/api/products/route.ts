import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { compressImages } from "@/lib/compress-image";
import { jwtVerify } from "jose";

const authSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret-key");

async function getAuthFromToken(request: Request): Promise<{ id: string | null; role: string | null }> {
  try {
    const token = request.headers.get("cookie")?.match(/auth-token=([^;]+)/)?.[1];
    if (!token) return { id: null, role: null };
    const { payload } = await jwtVerify(token, authSecret);
    return { id: (payload.id as string) || null, role: (payload.role as string) || null };
  } catch { return { id: null, role: null }; }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const slug = searchParams.get("slug");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const { id: userId, role: userRole } = await getAuthFromToken(request);

    const where: any = {};

    // Non-admin users only see their own products
    if (userId && userRole !== "ADMIN") {
      where.ownerId = userId;
    }

    if (slug) {
      where.slug = slug;
      // When fetching single product by slug, include images
      const product = await prisma.product.findUnique({
        where: { slug },
        include: { variants: true, offers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
      });
      return NextResponse.json(product ? [product] : []);
    } else if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const isStoreView = searchParams.get("store") === "true";
    const selectFields: any = {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      price: true,
      images: true,
      stock: true,
      initialStock: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      hasOffers: true,
      offers: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, quantity: true, price: true, sortOrder: true } },
    };
    if (!isStoreView) {
      selectFields.orderCount = true;
      selectFields.variants = { select: { id: true, name: true, price: true, stock: true } };
      selectFields._count = { select: { orders: true } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const response = NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

    if (isStoreView) {
      response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    }

    return response;
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      shortDescription,
      fullDescription,
      price,
      images,
      variants,
      initialStock,
    } = body;

    let productSlug = slug || "";
    if (!productSlug && name) {
      productSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (!productSlug) {
      productSlug = `product-${Date.now()}`;
    }

    let finalSlug = productSlug;
    let counter = 1;
    while (true) {
      const existingProduct = await prisma.product.findUnique({
        where: { slug: finalSlug },
      });
      if (!existingProduct) break;
      finalSlug = `${productSlug}-${counter}`;
      counter++;
    }

    const imagesStr = Array.isArray(images) ? JSON.stringify(images) : (images || "[]");
    const { images: compressedImages, thumbnail } = await compressImages(imagesStr);

    const { id: ownerId } = await getAuthFromToken(request);

    const product = await prisma.product.create({
      data: {
        name,
        slug: finalSlug,
        shortDescription,
        fullDescription,
        price,
        stock: initialStock || 0,
        initialStock: initialStock || 0,
        images: compressedImages,
        thumbnail,
        ownerId: ownerId || undefined,
        variants: variants
          ? {
              create: variants.map((v: any) => ({
                name: v.name,
                price: v.price,
                stock: v.stock || 0,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
