import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { BALADYA_ARABIC } from "../src/lib/baladya-arabic";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const WILAYAS: Record<number, string> = {
  1:"أدرار",2:"الشلف",3:"الأغواط",4:"أم البواقي",5:"باتنة",6:"بجاية",7:"بسكرة",8:"بشار",9:"البليدة",10:"البويرة",
  11:"تمنراست",12:"تبسة",13:"تلمسان",14:"تيارت",15:"تيزي وزو",16:"الجزائر",17:"الجلفة",18:"جيجل",19:"سطيف",20:"سعيدة",
  21:"سكيكدة",22:"سيدي بلعباس",23:"عنابة",24:"قالمة",25:"قسنطينة",26:"المدية",27:"مستغانم",28:"المسيلة",29:"معسكر",30:"ورقلة",
  31:"وهران",32:"البيض",33:"إليزي",34:"برج بوعريريج",35:"بومرداس",36:"الطارف",37:"تندوف",38:"تيسمسيلت",39:"الوادي",40:"خنشلة",
  41:"سوق أهراس",42:"تيبازة",43:"ميلة",44:"عين الدفلى",45:"النعامة",46:"عين تموشنت",47:"غرداية",48:"غليزان",
  49:"تيميمون",50:"برج باجي مختار",51:"أولاد جلال",52:"بني عباس",53:"عين صالح",54:"عين قزام",55:"توقرت",56:"جانت",57:"المغير",58:"المنيعة"
};

async function main() {
  const csv = readFileSync("C:\\Users\\geeee\\Downloads\\جدول بيانات بدون عنوان - الورقة1 (2).csv", "utf-8");
  const lines = csv.split("\n").filter((l) => l.trim()).slice(1);

  const wilayaMap: Record<number, string[]> = {};
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) continue;
    const commune = parts[0];
    const code = parseInt(parts[1], 10);
    if (!commune || isNaN(code)) continue;
    if (!wilayaMap[code]) wilayaMap[code] = [];
    wilayaMap[code].push(commune);
  }

  console.log("Clearing...");
  const tables = ["OrderStatusHistory", "Order", "PurchaseEntry", "Baladya", "ProductVariant", "Product", "Setting", "Wilaya"];
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
    } catch {}
  }

  const sorted = Object.keys(wilayaMap).map(Number).sort((a, b) => a - b);
  let tw = 0, tb = 0;

  for (const code of sorted) {
    const name = WILAYAS[code] || `ولاية ${code}`;
    const codeStr = String(code).padStart(2, "0");
    const w = await prisma.wilaya.create({ data: { code: codeStr, name } });
    tw++;
    const uniq = [...new Set(wilayaMap[code])];
    await prisma.baladya.createMany({
      data: uniq.map((c, i) => ({
        name: c,
        arabicName: BALADYA_ARABIC[c] || c,
        code: codeStr + String(i + 1).padStart(2, "0"),
        wilayaId: w.id,
      })),
    });
    tb += uniq.length;
    console.log(`  ${codeStr} - ${name}: ${uniq.length} baladyas`);
  }

  console.log(`Done! ${tw} wilayas, ${tb} baladyas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
