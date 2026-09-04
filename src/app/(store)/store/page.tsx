import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MEGA.MARKET - المنتجات",
  description: "تصفح منتجاتنا المميزة",
  openGraph: {
    title: "MEGA.MARKET",
    description: "تصفح منتجاتنا المميزة",
    type: "website",
  },
};

export const revalidate = 60;

async function getProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

export default async function StorePage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-gray-900">MEGA.MARKET</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-lg text-gray-500 mt-2">تصفح منتجاتنا المميزة</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-500">لا توجد منتجات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/store/${product.slug}`}>
                <div className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] rounded-2xl">
                  <div className="relative h-56 bg-gray-100 overflow-hidden">
                    <img
                      src={`/api/products/${product.id}/image/0?size=400`}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={400}
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-base font-bold">
                        {product.price.toLocaleString()} دج
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-xl text-gray-900 mb-1">{product.name}</h3>
                    {product.shortDescription && (
                      <p className="text-base text-gray-500 mb-3 line-clamp-2">{product.shortDescription}</p>
                    )}
                    <div className="flex items-center justify-end">
                      <span className="text-base font-bold text-gray-900">اطلب الآن →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200/60 bg-white/50 backdrop-blur-sm mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <span className="text-sm text-gray-400">© 2026 MEGA.MARKET. جميع الحقوق محفوظة.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
