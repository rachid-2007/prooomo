import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import sharp from "sharp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const products = await prisma.product.findMany({
      select: { id: true, name: true, images: true },
    });

    let converted = 0;
    let skipped = 0;
    let errors = 0;
    let bytesSaved = 0;
    const results: { id: string; name: string; before: number; after: number }[] = [];

    for (const product of products) {
      let images: string[];
      try {
        images = JSON.parse(product.images || "[]");
      } catch {
        skipped++;
        continue;
      }

      if (!Array.isArray(images) || images.length === 0) {
        skipped++;
        continue;
      }

      const newImages: string[] = [];
      let productBefore = 0;
      let productAfter = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (!img.startsWith("data:image/")) {
          newImages.push(img);
          continue;
        }

        try {
          const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) {
            newImages.push(img);
            continue;
          }

          const originalFormat = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          productBefore += buffer.length;

          if (originalFormat === "webp" || originalFormat === "avif") {
            newImages.push(img);
            productAfter += buffer.length;
            continue;
          }

          const webpBuffer = await sharp(buffer)
            .resize(800, 800, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          productAfter += webpBuffer.length;
          const webpBase64 = `data:image/webp;base64,${webpBuffer.toString("base64")}`;

          if (!dryRun) {
            newImages.push(webpBase64);
          } else {
            newImages.push(img);
          }

          converted++;
        } catch (e) {
          console.error(`Failed to convert image ${i} for product ${product.id}:`, e);
          newImages.push(img);
          errors++;
        }
      }

      bytesSaved += productBefore - productAfter;

      if (!dryRun && JSON.stringify(newImages) !== JSON.stringify(images)) {
        await prisma.product.update({
          where: { id: product.id },
          data: { images: JSON.stringify(newImages) },
        });
      }

      results.push({
        id: product.id,
        name: product.name,
        before: productBefore,
        after: productAfter,
      });
    }

    return NextResponse.json({
      dryRun,
      totalProducts: products.length,
      converted,
      skipped,
      errors,
      bytesSaved,
      mbSaved: (bytesSaved / 1024 / 1024).toFixed(2),
      results,
    });
  } catch (error: any) {
    console.error("Migration error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Migration failed" }, { status: 500 });
  }
}
