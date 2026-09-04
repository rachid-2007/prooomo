import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import StoreClient from "./client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, name: true, shortDescription: true, price: true },
    });
    if (!product) return { title: "المنتج غير موجود" };

    const imgUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://mega-market-alpha.vercel.app"}/api/products/${product.id}/image/0?size=800`;

    return {
      title: `${product.name} - MEGA.MARKET`,
      description: product.shortDescription || product.name,
      openGraph: {
        title: product.name,
        description: product.shortDescription || product.name,
        type: "website",
        images: [{ url: imgUrl, width: 800, height: 800 }],
      },
    };
  } catch {
    return { title: "MEGA.MARKET" };
  }
}

export const revalidate = 60;

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;

  let product = null;
  try {
    product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        fullDescription: true,
        price: true,
        images: true,
        hasOffers: true,
        hasColors: true,
        hasSizes: true,
        offers: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, quantity: true, price: true, sortOrder: true } },
        colors: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, image: true, sortOrder: true } },
        sizes: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sortOrder: true } },
      },
    });
  } catch {}

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">المنتج غير موجود</p>
        </div>
      </div>
    );
  }

  const fullDesc = product.fullDescription || "";

  let imageCount = 0;
  try {
    const imgs = JSON.parse(product.images || "[]");
    imageCount = Array.isArray(imgs) ? imgs.length : 0;
  } catch {}

  const imgUrl = `/api/products/${product.id}/image/0?size=800`;

  let colors = { primary: "#7c3aed", secondary: "#2563eb", background: "#ffffff", text: "#1f2937", accent: "#f59e0b" };
  try {
    const colorRec = await prisma.settings.findUnique({ where: { key: "form_colors" } });
    if (colorRec) colors = JSON.parse(colorRec.value);
  } catch {}

  const productMeta = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    fullDescription: fullDesc || null,
    price: product.price,
    hasOffers: product.hasOffers,
    offers: product.offers,
    hasColors: product.hasColors,
    colors: product.colors,
    hasSizes: product.hasSizes,
    sizes: product.sizes,
    imageCount,
  };

  return (
    <>
      <link rel="preload" as="image" href={imgUrl} fetchPriority="high" />
      <StoreClient productJson={JSON.stringify(productMeta)} colorsJson={JSON.stringify(colors)} />
    </>
  );
}
