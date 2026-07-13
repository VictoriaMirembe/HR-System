import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js dev mode hot-reloads modules on every save, which would normally
// re-run `new PrismaClient()` each time and open a fresh pool of DB
// connections until they're exhausted. Stashing the instance on `globalThis`
// survives the reload, so dev keeps reusing the same client. In production
// this file is only evaluated once per server instance, so the cache is a
// no-op there.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7's client generator no longer opens its own connection pool from
// a schema-level datasource URL — it requires an explicit "driver adapter"
// (here, @prisma/adapter-pg wrapping node-postgres) to be passed in. This is
// what actually talks to Postgres at query time.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
