import sharp from "sharp";

export async function compressImages(imagesJson: string): Promise<{ images: string; thumbnail: string }> {
  let images: string[];
  try {
    images = JSON.parse(imagesJson);
  } catch {
    return { images: imagesJson, thumbnail: "" };
  }

  if (!Array.isArray(images) || images.length === 0) return { images: imagesJson, thumbnail: "" };

  const compressed: string[] = [];
  let thumbnail = "";

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.startsWith("data:image/")) {
      compressed.push(img);
      if (i === 0) thumbnail = img;
      continue;
    }

    try {
      const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        compressed.push(img);
        if (i === 0) thumbnail = img;
        continue;
      }

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const webpBuffer = await sharp(buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const webpBase64 = `data:image/webp;base64,${webpBuffer.toString("base64")}`;
      compressed.push(webpBase64);
    } catch {
      compressed.push(img);
    }
  }

  // Always derive a small thumbnail from the first (compressed) image.
  // Never reuse the full image as thumbnail - list APIs embed it in every row.
  if (compressed.length > 0) {
    const first = compressed[0];
    if (first.startsWith("data:image/")) {
      const m = first.match(/^data:image\/\w+;base64,(.+)$/);
      if (m) {
        try {
          const buf = Buffer.from(m[1], "base64");
          const thumbBuffer = await sharp(buf)
            .resize(100, 100, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 50 })
            .toBuffer();
          thumbnail = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;
        } catch {
          thumbnail = "";
        }
      }
    } else {
      thumbnail = first;
    }
  }

  return { images: JSON.stringify(compressed), thumbnail };
}
