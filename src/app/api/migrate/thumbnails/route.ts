import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import sharp from "sharp";

export async function POST() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, images: true, thumbnail: true },
    });

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      if (product.thumbnail && product.thumbnail.startsWith("data:image/")) {
        skipped++;
        continue;
      }

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

      const first = images[0];
      if (!first.startsWith("data:image/")) {
        skipped++;
        continue;
      }

      try {
        const matches = first.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          skipped++;
          continue;
        }

        const buffer = Buffer.from(matches[2], "base64");
        const thumbBuffer = await sharp(buffer)
          .resize(100, 100, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 50 })
          .toBuffer();

        const thumbnail = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;
        await prisma.product.update({
          where: { id: product.id },
          data: { thumbnail },
        });
        updated++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ updated, skipped, total: products.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
