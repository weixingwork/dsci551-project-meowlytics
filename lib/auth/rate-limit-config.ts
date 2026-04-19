import { prisma } from '@/lib/db'

export interface RateLimitConfig {
  analyzeIpPerMinute: number
  analyzeUserPerDay: number
  forgotPerIpPerMinute: number
  forgotEmailCooldownSeconds: number
}

const CONFIG_KEY_MAP = {
  analyzeIpPerMinute: 'analyze_ip_per_minute',
  analyzeUserPerDay: 'analyze_user_per_day',
  forgotPerIpPerMinute: 'forgot_per_ip_per_minute',
  forgotEmailCooldownSeconds: 'forgot_email_cooldown_seconds',
} as const

const VALIDATION_RULES: Record<keyof RateLimitConfig, { min: number; max: number }> = {
  analyzeIpPerMinute: { min: 1, max: 120 },
  analyzeUserPerDay: { min: 1, max: 500 },
  forgotPerIpPerMinute: { min: 1, max: 60 },
  forgotEmailCooldownSeconds: { min: 30, max: 86_400 },
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  analyzeIpPerMinute: 6,
  analyzeUserPerDay: 10,
  forgotPerIpPerMinute: 5,
  forgotEmailCooldownSeconds: 300,
}

let ensureTablePromise: Promise<void> | null = null

async function ensureRateLimitConfigTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RateLimitConfig" (
        "key" TEXT PRIMARY KEY,
        "value" INTEGER NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).then(() => undefined)
  }

  await ensureTablePromise
}

function toConfigKey(dbKey: string): keyof RateLimitConfig | null {
  const pair = Object.entries(CONFIG_KEY_MAP).find(([, value]) => value === dbKey)
  return (pair?.[0] as keyof RateLimitConfig | undefined) ?? null
}

function validateConfigValue(key: keyof RateLimitConfig, value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${key} 必须是整数`)
  }

  const rule = VALIDATION_RULES[key]
  if (value < rule.min || value > rule.max) {
    throw new Error(`${key} 必须在 ${rule.min} 到 ${rule.max} 之间`)
  }

  return value
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  await ensureRateLimitConfigTable()

  const rows = await prisma.$queryRaw<{ key: string; value: number }[]>`
    SELECT "key", "value"
    FROM "RateLimitConfig"
  `

  const result: RateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG }
  for (const row of rows) {
    const key = toConfigKey(row.key)
    if (!key) continue
    result[key] = row.value
  }

  return result
}

export async function updateRateLimitConfig(
  updates: Partial<RateLimitConfig>
): Promise<RateLimitConfig> {
  await ensureRateLimitConfigTable()

  const entries = Object.entries(updates) as Array<[keyof RateLimitConfig, number]>
  for (const [key, rawValue] of entries) {
    const value = validateConfigValue(key, rawValue)
    const dbKey = CONFIG_KEY_MAP[key]

    await prisma.$executeRaw`
      INSERT INTO "RateLimitConfig" ("key", "value", "updatedAt")
      VALUES (${dbKey}, ${value}, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET "value" = ${value}, "updatedAt" = NOW()
    `
  }

  return getRateLimitConfig()
}
