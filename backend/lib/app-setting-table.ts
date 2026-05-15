import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const APP_SETTING_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
)
`;

export async function ensureAppSettingTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(APP_SETTING_TABLE_SQL);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021') {
      // If the table vanished between deploys, create it and let the caller retry.
      await prisma.$executeRawUnsafe(APP_SETTING_TABLE_SQL);
      return;
    }

    throw err;
  }
}