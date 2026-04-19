import { prisma } from '@/lib/db'

interface PasswordResetThrottleResult {
  allowed: boolean
  retryAfterSeconds: number
}

let ensureTablePromise: Promise<void> | null = null

async function ensurePasswordResetThrottleTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetThrottle" (
        "email" TEXT PRIMARY KEY,
        "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).then(() => undefined)
  }

  await ensureTablePromise
}

function secondsBetween(future: Date, now: Date): number {
  return Math.max(1, Math.ceil((future.getTime() - now.getTime()) / 1000))
}

export async function consumePasswordResetSend(
  email: string,
  cooldownSeconds: number
): Promise<PasswordResetThrottleResult> {
  await ensurePasswordResetThrottleTable()

  const rows = await prisma.$queryRaw<{ lastSentAt: Date }[]>`
    INSERT INTO "PasswordResetThrottle" ("email", "lastSentAt")
    VALUES (${email}, NOW())
    ON CONFLICT ("email")
    DO UPDATE
      SET "lastSentAt" = NOW()
      WHERE "PasswordResetThrottle"."lastSentAt" <= NOW() - (${cooldownSeconds} * INTERVAL '1 second')
    RETURNING "lastSentAt"
  `

  if (rows.length > 0) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const existing = await prisma.$queryRaw<{ lastSentAt: Date }[]>`
    SELECT "lastSentAt"
    FROM "PasswordResetThrottle"
    WHERE "email" = ${email}
    LIMIT 1
  `

  const lastSentAt = existing[0]?.lastSentAt
  if (!lastSentAt) {
    return { allowed: false, retryAfterSeconds: cooldownSeconds }
  }

  const retryAfterSeconds = secondsBetween(
    new Date(lastSentAt.getTime() + cooldownSeconds * 1000),
    new Date()
  )

  return { allowed: false, retryAfterSeconds }
}
