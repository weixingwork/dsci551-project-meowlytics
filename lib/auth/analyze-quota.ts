import { prisma } from '@/lib/db'

export const DAILY_ANALYZE_LIMIT = 10

interface AnalyzeQuotaResult {
  allowed: boolean
  used: number
  remaining: number
}

let ensureTablePromise: Promise<void> | null = null

function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

async function ensureAnalyzeQuotaTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyzeQuota" (
        "userId" TEXT NOT NULL,
        "dayKey" TEXT NOT NULL,
        "used" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "dayKey")
      )
    `).then(() => undefined)
  }

  await ensureTablePromise
}

function getSecondsUntilUtcMidnight(date = new Date()): number {
  const nextUtcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0
  )
  return Math.max(1, Math.floor((nextUtcMidnight - date.getTime()) / 1000))
}

export async function consumeAnalyzeQuota(
  userId: string,
  dailyLimit = DAILY_ANALYZE_LIMIT
): Promise<AnalyzeQuotaResult> {
  await ensureAnalyzeQuotaTable()

  const dayKey = getUtcDayKey()
  const rows = await prisma.$queryRaw<{ used: number }[]>`
    INSERT INTO "AnalyzeQuota" ("userId", "dayKey", "used", "updatedAt")
    VALUES (${userId}, ${dayKey}, 1, NOW())
    ON CONFLICT ("userId", "dayKey")
    DO UPDATE
      SET "used" = "AnalyzeQuota"."used" + 1,
          "updatedAt" = NOW()
      WHERE "AnalyzeQuota"."used" < ${dailyLimit}
    RETURNING "used"
  `

  if (rows.length > 0) {
    const used = rows[0].used
    return {
      allowed: true,
      used,
      remaining: Math.max(0, dailyLimit - used),
    }
  }

  const current = await prisma.$queryRaw<{ used: number }[]>`
    SELECT "used"
    FROM "AnalyzeQuota"
    WHERE "userId" = ${userId} AND "dayKey" = ${dayKey}
    LIMIT 1
  `

  const used = current[0]?.used ?? dailyLimit
  return {
    allowed: false,
    used,
    remaining: 0,
  }
}

export function getAnalyzeQuotaRetryAfterSeconds(): number {
  return getSecondsUntilUtcMidnight()
}
