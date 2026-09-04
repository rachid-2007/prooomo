import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const user = await prisma.user.findUnique({
      where: { storeSlug: slug },
      select: { name: true },
    });
    if (!user) return { title: "متجر غير موجود" };
    return {
      title: `${user.name} - MEGA.MARKET`,
      description: `تصفح منتجات ${user.name}`,
    };
  } catch {
    return { title: "MEGA.MARKET" };
  }
}

export const revalidate = 60;

export default async function StorePage({ params }: Props) {
  const { slug } = await params;

  let user = null;
  let products: any[] = [];
  try {
    user = await prisma.user.findUnique({
      where: { storeSlug: slug },
      select: { id: true, name: true },
    });
    if (user) {
      products = await prisma.product.findMany({
        where: { ownerId: user.id, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          price: true,
          images: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }
  } catch {}

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">متجر غير موجود</p>
          <Link href="/store" className="text-sm text-gray-500 mt-4 inline-block hover:underline">العودة للمتجر</Link>
        </div>
      </div>
    );
  }

  let colors = { primary: "#7c3aed", secondary: "#2563eb", background: "#ffffff", text: "#1f2937", accent: "#f59e0b" };
  try {
    const colorRec = await prisma.settings.findUnique({ where: { key: "form_colors" } });
    if (colorRec) colors = JSON.parse(colorRec.value);
  } catch {}

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: `${colors.background}dd`, borderColor: `${colors.text}11` }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold" style={{ color: colors.text }}>{user.name}</span>
          </div>
          <Link href="/store" className="text-sm hover:underline" style={{ color: colors.secondary }}>المتجر العام</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold" style={{ color: colors.text }}>منتجات {user.name}</h1>
          <p className="text-lg mt-2" style={{ color: `${colors.text}88` }}>تصفح جميع المنتجات</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg" style={{ color: `${colors.text}66` }}>لا توجد منتجات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              let imgUrl = `/api/products/${product.id}/image/0?size=400`;
              return (
                <Link key={product.id} href={`/store/${product.slug}`}>
                  <div className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group rounded-2xl" style={{ backgroundColor: `${colors.background}`, border: `1px solid ${colors.text}11` }}>
                    <div className="relative h-56 bg-gray-100 overflow-hidden">
                      <img src={imgUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width={400} height={400} />
                      <div className="absolute top-3 right-3">
                        <span className="text-white px-3 py-1 rounded-full text-base font-bold" style={{ backgroundColor: colors.primary }}>
                          {product.price.toLocaleString()} دج
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-xl mb-1" style={{ color: colors.text }}>{product.name}</h3>
                      {product.shortDescription && (
                        <p className="text-base mb-3 line-clamp-2" style={{ color: `${colors.text}88` }}>{product.shortDescription}</p>
                      )}
                      <div className="flex items-center justify-end">
                        <span className="text-base font-bold" style={{ color: colors.primary }}>اطلب الآن →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t mt-16" style={{ borderColor: `${colors.text}11` }}>
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center">
          <span className="text-sm" style={{ color: `${colors.text}44` }}>© 2026 MEGA.MARKET. جميع الحقوق محفوظة.</span>
        </div>
      </footer>
    </div>
  );
}
