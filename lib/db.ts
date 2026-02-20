// require ile yükleme: Prisma client generate edilmemişse TS "has no exported member" hatası vermez
const { PrismaClient } = require("@prisma/client");

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance | undefined };

export const db: PrismaClientInstance =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
