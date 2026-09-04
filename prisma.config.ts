import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env["DATABASE_URL"] || "";
const isPostgres = databaseUrl.startsWith("postgresql");

export default defineConfig({
  schema: isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
