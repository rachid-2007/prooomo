import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
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

async function main() {
  console.log(`Updating baladya arabicName (${isPostgres ? "PostgreSQL" : "SQLite"})...`);

  const baladyas = await prisma.baladya.findMany({ select: { id: true, name: true } });
  const toUpdate = baladyas.filter((b) => BALADYA_ARABIC[b.name]);
  let updated = 0;

  const BATCH = 100;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((b) =>
        prisma.baladya.update({
          where: { id: b.id },
          data: { arabicName: BALADYA_ARABIC[b.name] },
        })
      )
    );
    updated += chunk.length;
    console.log(`  ${updated}/${toUpdate.length} updated...`);
  }

  console.log(`Done! Updated ${updated} baladyas out of ${baladyas.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
