import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL || "";

  if (url.startsWith("postgresql")) {
    const { PrismaPg } = require("@prisma/adapter-pg");
    const { Pool } = require("pg");
    // Generous timeouts: the DB (Neon) may be cold and need seconds to wake up.
    // A failed first attempt surfaces as "not found" pages, so let it wait.
    const pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 30000,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  if (url.startsWith("file:") || url.includes(".db")) {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

let _proxy: PrismaClient | null = null;

function getProxy(): PrismaClient {
  if (_proxy) return _proxy;

  if (process.env.NODE_ENV !== "production") {
    if (globalForPrisma.prisma) {
      _proxy = globalForPrisma.prisma;
      return _proxy;
    }
  }

  _proxy = new Proxy({} as PrismaClient, {
    get(_t, prop) {
      const client = getClient();
      const val = (client as any)[prop];
      return typeof val === "function" ? val.bind(client) : val;
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _proxy;
  }

  return _proxy;
}

export const prisma = getProxy();
export default prisma;
