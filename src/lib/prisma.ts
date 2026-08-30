import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const TMP_DB = '/tmp/beau-roi.db';

function ensureDb(): string {
  if (!process.env.VERCEL) {
    return process.env.DATABASE_URL || 'file:./dev.db';
  }
  if (!fs.existsSync(TMP_DB)) {
    const src = path.join(process.cwd(), 'prisma', 'seed.db');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, TMP_DB);
    }
  }
  return `file:${TMP_DB}`;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: ensureDb() } } });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
