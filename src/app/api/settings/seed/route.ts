import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ORIGINAL_PRICES: Record<string, { home: number; office: number }> = {
  "01": { home: 1000, office: 500 },
  "02": { home: 650, office: 400 },
  "03": { home: 800, office: 450 },
  "04": { home: 750, office: 400 },
  "05": { home: 750, office: 400 },
  "06": { home: 650, office: 400 },
  "07": { home: 800, office: 450 },
  "08": { home: 1000, office: 600 },
  "09": { home: 450, office: 200 },
  "10": { home: 600, office: 400 },
  "11": { home: 1200, office: 700 },
  "12": { home: 750, office: 500 },
  "13": { home: 750, office: 400 },
  "14": { home: 650, office: 400 },
  "15": { home: 600, office: 400 },
  "16": { home: 400, office: 200 },
  "17": { home: 800, office: 450 },
  "18": { home: 650, office: 400 },
  "19": { home: 600, office: 400 },
  "20": { home: 700, office: 400 },
  "21": { home: 650, office: 400 },
  "22": { home: 700, office: 400 },
  "23": { home: 650, office: 400 },
  "24": { home: 700, office: 400 },
  "25": { home: 650, office: 400 },
  "26": { home: 600, office: 400 },
  "27": { home: 650, office: 400 },
  "28": { home: 700, office: 400 },
  "29": { home: 650, office: 400 },
  "30": { home: 900, office: 500 },
  "31": { home: 650, office: 400 },
  "32": { home: 800, office: 500 },
  "33": { home: 1300, office: 550 },
  "34": { home: 650, office: 400 },
  "35": { home: 600, office: 400 },
  "36": { home: 700, office: 400 },
  "37": { home: 1200, office: 550 },
  "38": { home: 700, office: 400 },
  "39": { home: 800, office: 450 },
  "40": { home: 750, office: 450 },
  "41": { home: 750, office: 450 },
  "42": { home: 600, office: 400 },
  "43": { home: 650, office: 400 },
  "44": { home: 600, office: 400 },
  "45": { home: 800, office: 450 },
  "46": { home: 650, office: 350 },
  "47": { home: 850, office: 450 },
  "48": { home: 650, office: 350 },
  "49": { home: 1000, office: 550 },
  "51": { home: 900, office: 500 },
  "52": { home: 1100, office: 0 },
  "53": { home: 1100, office: 550 },
  "55": { home: 900, office: 450 },
  "57": { home: 900, office: 0 },
  "58": { home: 1000, office: 450 },
};

export async function POST() {
  try {
    await prisma.settings.upsert({
      where: { key: "shipping_prices" },
      update: { value: JSON.stringify(ORIGINAL_PRICES) },
      create: { key: "shipping_prices", value: JSON.stringify(ORIGINAL_PRICES) },
    });
    return NextResponse.json({ ok: true, count: Object.keys(ORIGINAL_PRICES).length });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
