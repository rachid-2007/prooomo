import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

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

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  const adminPassword = await bcrypt.hash("admin123", 10);
  const workerPassword = await bcrypt.hash("worker123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "المدير",
      email: "admin@example.com",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
      phone: "0550000000",
    },
  });

  const worker = await prisma.user.create({
    data: {
      name: "عامل 1",
      email: "worker@example.com",
      username: "worker1",
      password: workerPassword,
      role: "WORKER",
      phone: "0551111111",
    },
  });

  console.log(`Created users: ${admin.email}, ${worker.email}`);

  // --- Products (electronics) ---
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "سماعة بلوتوث لاسلكية",
        slug: "wireless-bluetooth-speaker",
        shortDescription: "سماعة بلوتوث محمولة بصوت قوي وتصميم عصري",
        fullDescription:
          "سماعة بلوتوث لاسلكية بتقنية الصوت المحيطي 360 درجة. مقاومة للماء IPX5، عمر بطارية يصل إلى 12 ساعة. مثالية للرحلات والخارج.",
        price: 4500,
        images: JSON.stringify([
          "https://placehold.co/600x600?text=Speaker+1",
          "https://placehold.co/600x600?text=Speaker+2",
        ]),
        orderCount: 120,
      },
    }),
    prisma.product.create({
      data: {
        name: "ساعة ذكية رياضية",
        slug: "smart-sports-watch",
        shortDescription: "ساعة ذكية بتتبع اللياقة والصحة على مدار الساعة",
        fullDescription:
          "ساعة ذكية بشاشة AMOLED فائقة الوضوح، تدعم تتبع النبض، النوم، والتمارين الرياضية. مقاومة للماء حتى 50 متر.",
        price: 8900,
        images: JSON.stringify([
          "https://placehold.co/600x600?text=Watch+1",
          "https://placehold.co/600x600?text=Watch+2",
        ]),
        orderCount: 85,
      },
    }),
    prisma.product.create({
      data: {
        name: "سماعات أذن لاسلكية",
        slug: "wireless-earbuds",
        shortDescription: "سماعات أذن بلوتوث بتقنية إلغاء الضوضاء",
        fullDescription:
          "سماعات أذن لاسلكية بتقنية إلغاء الضوضاء النشط (ANC). صوت نقي مع باس عميق. علبة شحن مغناطيسية تدعم الشحن السريع.",
        price: 3200,
        images: JSON.stringify([
          "https://placehold.co/600x600?text=Earbuds+1",
          "https://placehold.co/600x600?text=Earbuds+2",
        ]),
        orderCount: 200,
      },
    }),
    prisma.product.create({
      data: {
        name: "شاحن متنقل فائق السعة",
        slug: "power-bank-20000mah",
        shortDescription: "شاحن متنقل بسعة 20000 مللي أمبير مع شحن سريع",
        fullDescription:
          "شاحن متنقل فائق السعة 20000mAh مع مخرجين USB-C و USB-A. يدعم الشحن السريع PD 65W. مناسب للهواتف والأجهزة اللوحية.",
        price: 5500,
        images: JSON.stringify([
          "https://placehold.co/600x600?text=PowerBank+1",
          "https://placehold.co/600x600?text=PowerBank+2",
        ]),
        orderCount: 150,
      },
    }),
    prisma.product.create({
      data: {
        name: "كفر هاتف مقاوم للصدمات",
        slug: "shockproof-phone-case",
        shortDescription: "كفر هاتف مقاوم للصدمات والماء بتصميم أنيق",
        fullDescription:
          "كفر هاتف مقاوم للصدمات ب-material TPU متين. يحمي الهاتف من السقوط حتى 3 أمتار. تصميم شفاف يحافظ على جمالية الهاتف الأصلية.",
        price: 1200,
        images: JSON.stringify([
          "https://placehold.co/600x600?text=Case+1",
          "https://placehold.co/600x600?text=Case+2",
        ]),
        orderCount: 300,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // --- Wilayas ---
  const wilayasData: { code: string; name: string }[] = [
    { code: "01", name: "أدرار" },
    { code: "02", name: "الشلف" },
    { code: "03", name: "الأغواط" },
    { code: "04", name: "أم البواقي" },
    { code: "05", name: "باتنة" },
    { code: "06", name: "بجاية" },
    { code: "07", name: "بسكرة" },
    { code: "08", name: "بشار" },
    { code: "09", name: "البليدة" },
    { code: "10", name: "البويرة" },
    { code: "11", name: "تمنراست" },
    { code: "12", name: "تبسة" },
    { code: "13", name: "تلمسان" },
    { code: "14", name: "تيارت" },
    { code: "15", name: "تيزي وزو" },
    { code: "16", name: "الجزائر" },
    { code: "17", name: "الجلفة" },
    { code: "18", name: "جيجل" },
    { code: "19", name: "سطيف" },
    { code: "20", name: "سعيدة" },
    { code: "21", name: "سكيكدة" },
    { code: "22", name: "سيدي بلعباس" },
    { code: "23", name: "عنابة" },
    { code: "24", name: "قالمة" },
    { code: "25", name: "قسنطينة" },
    { code: "26", name: "المدية" },
    { code: "27", name: "مستغانم" },
    { code: "28", name: "المسيلة" },
    { code: "29", name: "معسكر" },
    { code: "30", name: "ورقلة" },
    { code: "31", name: "وهران" },
    { code: "32", name: "البيض" },
    { code: "33", name: "إليزي" },
    { code: "34", name: "برج بوعريريج" },
    { code: "35", name: "بومرداس" },
    { code: "36", name: "الطارف" },
    { code: "37", name: "تندوف" },
    { code: "38", name: "تيسمسيلت" },
    { code: "39", name: "الوادي" },
    { code: "40", name: "خنشلة" },
    { code: "41", name: "سوق أهراس" },
    { code: "42", name: "تيبازة" },
    { code: "43", name: "ميلة" },
    { code: "44", name: "عين الدفلى" },
    { code: "45", name: "النعامة" },
    { code: "46", name: "عين تموشنت" },
    { code: "47", name: "غرداية" },
    { code: "48", name: "غليزان" },
  ];

  const createdWilayas = [];
  for (const w of wilayasData) {
    const wilaya = await prisma.wilaya.create({ data: w });
    createdWilayas.push(wilaya);
  }

  console.log(`Created ${createdWilayas.length} wilayas`);

  // --- Baladyas (sample for a few wilayas) ---
  const baladyasData: Record<string, { name: string; code: string }[]> = {
    "16": [
      { name: "الجزائر الوسطى", code: "1601" },
      { name: "بئر مراد رايس", code: "1602" },
      { name: "حسين داي", code: "1603" },
      { name: "الحراش", code: "1604" },
      { name: "بوزريعة", code: "1605" },
    ],
    "31": [
      { name: "وهران", code: "3101" },
      { name: "السانية", code: "3102" },
      { name: "العنصر", code: "3103" },
      { name: "بئر الجير", code: "3104" },
    ],
    "19": [
      { name: "سطيف", code: "1901" },
      { name: "العلمة", code: "1902" },
      { name: "أولاد تبان", code: "1903" },
    ],
    "25": [
      { name: "قسنطينة", code: "2501" },
      { name: "الخروب", code: "2502" },
      { name: "ديموية", code: "2503" },
    ],
    "05": [
      { name: "باتنة", code: "0501" },
      { name: "باري", code: "0502" },
      { name: "نقاوس", code: "0503" },
    ],
  };

  const createdBaladyas: Record<string, { id: string }[]> = {};
  for (const [wilayaCode, baladyas] of Object.entries(baladyasData)) {
    const wilaya = createdWilayas.find((w) => w.code === wilayaCode);
    if (!wilaya) continue;
    const created: { id: string }[] = [];
    for (const b of baladyas) {
      const baladya = await prisma.baladya.create({
        data: { ...b, wilayaId: wilaya.id },
      });
      created.push(baladya);
    }
    createdBaladyas[wilayaCode] = created;
  }

  console.log("Created sample baladyas");

  // --- Orders ---
  const statuses = ["NEW", "CONFIRMED", "IN_DELIVERY", "DELIVERED", "NOT_ANSWERED_1", "PHONE_CLOSED_1", "OUT_OF_COVERAGE_1", "RETURN_PENDING", "PAID"];
  const customerNames = [
    "أحمد بن محمد",
    "فاطمة الزهراء",
    "يوسف بوعلام",
    "مريم حداد",
    "عبد الرحمن سعيد",
    "نورة بلقاسم",
    "كريم مرابط",
    "سارة بن عمر",
    "محمد الأمين",
    "هدى بوزيد",
    "يوسف تazi",
    "خالد مراد",
  ];
  const phoneNumbers = [
    "0550123456",
    "0661234567",
    "0770345678",
    "0555456789",
    "0666567890",
    "0771678901",
    "0552789012",
    "0663890123",
    "0774901234",
    "0555012345",
    "0666123456",
    "0777234567",
  ];
  const addresses = [
    "شارع الحرية، حي النصر",
    "شارع الاستقلال، حي السلام",
    "شارع بن مليك، حي المخاليف",
    "شارع 1 نوفمبر، حي النصر",
    "حي 500 مسكن، شارع الأمير عبد القادر",
    "شارع فرانتز فانون، حي السلام",
  ];
  const notes = [
    null,
    "التوصيل في الصباح الباكر",
    "الاتصال قبل الوصول",
    null,
    "يوجد باب خلفي",
    null,
  ];

  const orderStatusesMap: Record<string, string[]> = {
    "05": ["NEW", "CONFIRMED", "IN_DELIVERY", "DELIVERED"],
    "16": ["NEW", "CONFIRMED", "IN_DELIVERY", "DELIVERED", "NOT_ANSWERED_1", "PHONE_CLOSED_1"],
    "19": ["CONFIRMED", "DELIVERED", "PAID"],
    "25": ["NEW", "IN_DELIVERY", "DELIVERED", "OUT_OF_COVERAGE_1"],
    "31": ["NEW", "CONFIRMED", "DELIVERED", "RETURN_PENDING"],
  };

  const orderWilayas = [
    "05", "16", "19", "25", "31",
    "09", "23", "35", "06", "15",
  ];

  let orderCounter = 0;
  const ordersToCreate: {
    product: (typeof products)[number];
    wilayaCode: string;
    status: string;
    customerIdx: number;
    quantity: number;
  }[] = [];

  for (const product of products) {
    const numOrders = 2 + Math.floor(Math.random() * 2); // 2-3 orders per product
    for (let i = 0; i < numOrders; i++) {
      const wilayaCode =
        orderWilayas[Math.floor(Math.random() * orderWilayas.length)];
      const availableStatuses = orderStatusesMap[wilayaCode] || statuses;
      const status =
        availableStatuses[Math.floor(Math.random() * availableStatuses.length)];
      const customerIdx = Math.floor(Math.random() * customerNames.length);
      const quantity = 1 + Math.floor(Math.random() * 3); // 1-3

      ordersToCreate.push({
        product,
        wilayaCode,
        status,
        customerIdx,
        quantity,
      });
    }
  }

  for (const orderData of ordersToCreate) {
    const { product, wilayaCode, status, customerIdx, quantity } = orderData;
    const wilaya = createdWilayas.find((w) => w.code === wilayaCode);
    if (!wilaya) continue;

    const baladyas = createdBaladyas[wilayaCode];
    const baladya =
      baladyas && baladyas.length > 0
        ? baladyas[Math.floor(Math.random() * baladyas.length)]
        : null;

    const shippingPrice = wilayaCode === "16" ? 400 : 600;
    const totalPrice = product.price * quantity + shippingPrice;

    orderCounter++;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-2026-${String(orderCounter).padStart(4, "0")}`,
        productId: product.id,
        customerName: customerNames[customerIdx],
        customerPhone: phoneNumbers[customerIdx],
        customerAddress:
          addresses[Math.floor(Math.random() * addresses.length)],
        wilayaId: wilaya.id,
        baladyaId: baladya?.id || null,
        quantity,
        productPrice: product.price,
        shippingPrice,
        totalPrice,
        status,
        notes: notes[Math.floor(Math.random() * notes.length)],
      },
    });

    // Create status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: null,
        newStatus: status,
        changedBy: "System",
        note: "تم إنشاء الطلب",
      },
    });
  }

  console.log(`Created ${orderCounter} orders`);

  // --- Purchase Entries ---
  const suppliers = [
    "شركة التقنية المتقدمة",
    "مؤسسة الأجهزة الحديثة",
    "شركة الإلكترونيات المتحدة",
    "مؤسسة الهواتف الذكية",
  ];

  for (const product of products) {
    const numPurchases = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPurchases; i++) {
      const quantity = 50 + Math.floor(Math.random() * 100); // 50-150
      const unitPrice = product.price * 0.4; // 40% of retail
      const total = quantity * unitPrice;

      await prisma.purchaseEntry.create({
        data: {
          reference: `PUR-${product.slug.substring(0, 8).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          total,
          productId: product.id,
          quantity,
          unitPrice,
          note: `شراء ${quantity} وحدة من ${product.name}`,
        },
      });
    }
  }

  console.log("Created purchase entries");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
