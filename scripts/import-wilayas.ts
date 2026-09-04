import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { BALADYA_ARABIC } from "../src/lib/baladya-arabic";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgresql");

let prisma: PrismaClient;

if (isPostgres) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  prisma = new PrismaClient({ adapter });
} else {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prisma = new PrismaClient({ adapter });
}

const WILAYAS_AR: Record<number, string> = {
  1: "أدرار", 2: "الشلف", 3: "الأغواط", 4: "أم البواقي", 5: "باتنة",
  6: "بجاية", 7: "بسكرة", 8: "بشار", 9: "البليدة", 10: "البويرة",
  11: "تمنراست", 12: "تبسة", 13: "تلمسان", 14: "تيارت", 15: "تيزي وزو",
  16: "الجزائر", 17: "الجلفة", 18: "جيجل", 19: "سطيف", 20: "سعيدة",
  21: "سكيكدة", 22: "سيدي بلعباس", 23: "عنابة", 24: "قالمة", 25: "قسنطينة",
  26: "المدية", 27: "مستغانم", 28: "المسيلة", 29: "معسكر", 30: "ورقلة",
  31: "وهران", 32: "البيض", 33: "إليزي", 34: "برج بوعريريج", 35: "بومرداس",
  36: "الطارف", 37: "تندوف", 38: "تيسمسيلت", 39: "الوادي", 40: "خنشلة",
  41: "سوق أهراس", 42: "تيبازة", 43: "ميلة", 44: "عين الدفلى", 45: "النعامة",
  46: "عين تموشنت", 47: "غرداية", 48: "غليزان",
  49: "تيميمون", 50: "برج باجي مختار", 51: "أولاد جلال",
  52: "بني عباس",   53: "عين صالح", 54: "عين قزام",
  55: "توقرت", 56: "جانت", 57: "المغير", 58: "المنيعة",
};

async function main() {
  console.log("=== Importing Wilayas & Baladyas from CSV ===");

  const csvPath = "C:\\Users\\geeee\\Downloads\\جدول بيانات بدون عنوان - الورقة1 (2).csv";
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // Skip header
  const dataLines = lines.slice(1);

  // CSV columns:
  //   col 0: commune name
  //   col 1: code wilayas = ACTUAL WILAYA CODE
  //   col 2: code wilaya = grid row number (ignore)
  //   col 3: nom wilaya = grid column header (ignore, use our Arabic names)
  const wilayaMap: Record<number, string[]> = {};

  for (const line of dataLines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) continue;

    const communeName = parts[0];
    const wilayaCode = parseInt(parts[1], 10);

    if (!communeName || isNaN(wilayaCode)) continue;

    if (!wilayaMap[wilayaCode]) {
      wilayaMap[wilayaCode] = [];
    }

    wilayaMap[wilayaCode].push(communeName);
  }

  // Delete existing data using raw SQL
  console.log("Clearing existing data...");
  try { await prisma.$executeRaw`DELETE FROM "OrderStatusHistory"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "Order"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "PurchaseEntry"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "Baladya"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "Product"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "Setting"`; } catch {}
  try { await prisma.$executeRaw`DELETE FROM "Wilaya"`; } catch {}

  // Create wilayas and baladyas
  const sortedCodes = Object.keys(wilayaMap)
    .map(Number)
    .sort((a, b) => a - b);

  let totalWilayas = 0;
  let totalBaladyas = 0;

  for (const code of sortedCodes) {
    const communes = wilayaMap[code];
    const codeStr = String(code).padStart(2, "0");
    const name = WILAYAS_AR[code] || `ولاية ${code}`;

    const wilaya = await prisma.wilaya.create({
      data: { code: codeStr, name },
    });
    totalWilayas++;

    // Deduplicate communes
    const uniqueCommunes = [...new Set(communes)];

    for (let i = 0; i < uniqueCommunes.length; i++) {
      const communeCode = `${codeStr}${String(i + 1).padStart(2, "0")}`;
      await prisma.baladya.create({
        data: {
          name: uniqueCommunes[i],
          arabicName: BALADYA_ARABIC[uniqueCommunes[i]] || uniqueCommunes[i],
          code: communeCode,
          wilayaId: wilaya.id,
        },
      });
      totalBaladyas++;
    }

    console.log(`  ${codeStr} - ${name}: ${uniqueCommunes.length} baladyas`);
  }

  console.log(`\nDone! Created ${totalWilayas} wilayas and ${totalBaladyas} baladyas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
