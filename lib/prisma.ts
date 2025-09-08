// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // this prevents multiple instances of Prisma Client in dev
  // which can cause issues with hot-reloading in Next.js
  // (only for development)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}