/**
 * DSCI 551 Demo — Deterministic Seed Script
 *
 * Populates the meowlytics_551 database with synthetic but realistic data
 * so that EXPLAIN ANALYZE demonstrations show meaningful planner behavior.
 *
 * Scale:
 *   - 10,000 Ingredients (50 real base ingredients × variants)
 *   - 50 Users + 1 demo user
 *   - 5,000 Favorites (2,000 on the demo user, 3,000 spread across others)
 *
 * Determinism:
 *   Uses a fixed-seed linear congruential PRNG so every run produces identical
 *   data. This means TA's EXPLAIN ANALYZE output is reproducible from this file.
 *
 * Demo user credentials:
 *   email:    demo@551.edu
 *   password: demo551
 *
 * Usage:
 *   npx tsx dsci551/seed/seed.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { scrypt as scryptCallback, randomBytes } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCallback)

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// -------------------------------------------------------------
// Deterministic PRNG (Mulberry32) — same seed → same data
// -------------------------------------------------------------
function makeRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = makeRng(551551)
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min

// -------------------------------------------------------------
// Base ingredient catalog — 50 real cat-food ingredients
// -------------------------------------------------------------
const BASE_INGREDIENTS: Array<{
  name: string
  nameEn: string
  category: string
  healthImpact: string
}> = [
  { name: '鸡肉', nameEn: 'Chicken', category: 'Protein', healthImpact: 'positive' },
  { name: '鸡肉粉', nameEn: 'Chicken Meal', category: 'Protein', healthImpact: 'positive' },
  { name: '火鸡', nameEn: 'Turkey', category: 'Protein', healthImpact: 'positive' },
  { name: '鸭肉', nameEn: 'Duck', category: 'Protein', healthImpact: 'positive' },
  { name: '牛肉', nameEn: 'Beef', category: 'Protein', healthImpact: 'positive' },
  { name: '羊肉', nameEn: 'Lamb', category: 'Protein', healthImpact: 'positive' },
  { name: '三文鱼', nameEn: 'Salmon', category: 'Protein', healthImpact: 'positive' },
  { name: '金枪鱼', nameEn: 'Tuna', category: 'Protein', healthImpact: 'neutral' },
  { name: '白鱼', nameEn: 'Whitefish', category: 'Protein', healthImpact: 'positive' },
  { name: '沙丁鱼', nameEn: 'Sardine', category: 'Protein', healthImpact: 'positive' },
  { name: '鸡蛋', nameEn: 'Egg', category: 'Protein', healthImpact: 'positive' },
  { name: '兔肉', nameEn: 'Rabbit', category: 'Protein', healthImpact: 'positive' },
  { name: '鹿肉', nameEn: 'Venison', category: 'Protein', healthImpact: 'positive' },
  { name: '动物副产品', nameEn: 'Animal By-Product', category: 'Protein', healthImpact: 'negative' },
  { name: '肉类副产品粉', nameEn: 'Meat By-Product Meal', category: 'Protein', healthImpact: 'negative' },
  { name: '糙米', nameEn: 'Brown Rice', category: 'Grain', healthImpact: 'neutral' },
  { name: '白米', nameEn: 'White Rice', category: 'Grain', healthImpact: 'neutral' },
  { name: '燕麦', nameEn: 'Oats', category: 'Grain', healthImpact: 'positive' },
  { name: '大麦', nameEn: 'Barley', category: 'Grain', healthImpact: 'neutral' },
  { name: '玉米', nameEn: 'Corn', category: 'Grain', healthImpact: 'negative' },
  { name: '玉米粉', nameEn: 'Corn Meal', category: 'Grain', healthImpact: 'negative' },
  { name: '小麦', nameEn: 'Wheat', category: 'Grain', healthImpact: 'negative' },
  { name: '小麦面筋', nameEn: 'Wheat Gluten', category: 'Grain', healthImpact: 'negative' },
  { name: '土豆', nameEn: 'Potato', category: 'Vegetable', healthImpact: 'neutral' },
  { name: '甘薯', nameEn: 'Sweet Potato', category: 'Vegetable', healthImpact: 'positive' },
  { name: '豌豆', nameEn: 'Peas', category: 'Vegetable', healthImpact: 'neutral' },
  { name: '胡萝卜', nameEn: 'Carrot', category: 'Vegetable', healthImpact: 'positive' },
  { name: '菠菜', nameEn: 'Spinach', category: 'Vegetable', healthImpact: 'positive' },
  { name: '南瓜', nameEn: 'Pumpkin', category: 'Vegetable', healthImpact: 'positive' },
  { name: '蔓越莓', nameEn: 'Cranberry', category: 'Fruit', healthImpact: 'positive' },
  { name: '蓝莓', nameEn: 'Blueberry', category: 'Fruit', healthImpact: 'positive' },
  { name: '苹果', nameEn: 'Apple', category: 'Fruit', healthImpact: 'neutral' },
  { name: '鱼油', nameEn: 'Fish Oil', category: 'Fat', healthImpact: 'positive' },
  { name: '鸡脂肪', nameEn: 'Chicken Fat', category: 'Fat', healthImpact: 'positive' },
  { name: '植物油', nameEn: 'Vegetable Oil', category: 'Fat', healthImpact: 'neutral' },
  { name: '亚麻籽', nameEn: 'Flaxseed', category: 'Fat', healthImpact: 'positive' },
  { name: '牛磺酸', nameEn: 'Taurine', category: 'Supplement', healthImpact: 'positive' },
  { name: '维生素E', nameEn: 'Vitamin E', category: 'Supplement', healthImpact: 'positive' },
  { name: '维生素A', nameEn: 'Vitamin A', category: 'Supplement', healthImpact: 'positive' },
  { name: '维生素D', nameEn: 'Vitamin D', category: 'Supplement', healthImpact: 'positive' },
  { name: '葡萄糖胺', nameEn: 'Glucosamine', category: 'Supplement', healthImpact: 'positive' },
  { name: '益生菌', nameEn: 'Probiotics', category: 'Supplement', healthImpact: 'positive' },
  { name: 'BHA', nameEn: 'BHA', category: 'Preservative', healthImpact: 'negative' },
  { name: 'BHT', nameEn: 'BHT', category: 'Preservative', healthImpact: 'negative' },
  { name: '乙氧基喹', nameEn: 'Ethoxyquin', category: 'Preservative', healthImpact: 'negative' },
  { name: '迷迭香提取物', nameEn: 'Rosemary Extract', category: 'Preservative', healthImpact: 'positive' },
  { name: '混合生育酚', nameEn: 'Mixed Tocopherols', category: 'Preservative', healthImpact: 'positive' },
  { name: '焦糖色素', nameEn: 'Caramel Color', category: 'Additive', healthImpact: 'negative' },
  { name: '盐', nameEn: 'Salt', category: 'Mineral', healthImpact: 'neutral' },
  { name: '氯化钾', nameEn: 'Potassium Chloride', category: 'Mineral', healthImpact: 'neutral' },
]

// Variant modifiers — combine with base ingredients to reach 10k rows
const FORMS = ['', ' Meal', ' Powder', ' Extract', ' Concentrate', ' Hydrolysate', ' Isolate']
const GRADES = ['', ' (Premium)', ' (Standard)', ' (Raw)', ' (Dehydrated)', ' (Freeze-Dried)']
const ORIGINS = ['', ' US', ' EU', ' AU', ' NZ', ' CA', ' JP']

const SOURCES = ['knowledge_base', 'ai_generated']

const HEALTH_IMPACTS: Record<string, { benefits: string[]; concerns: string[] }> = {
  positive: {
    benefits: ['High quality protein source', 'Rich in essential nutrients', 'Supports immune health'],
    concerns: ['May cause allergies in sensitive cats'],
  },
  neutral: {
    benefits: ['Provides energy', 'Common and widely available'],
    concerns: ['Nutritional value varies by preparation'],
  },
  negative: {
    benefits: ['Inexpensive filler'],
    concerns: ['Low biological value', 'Potential allergen', 'May cause digestive issues'],
  },
}

function toDemoCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    Protein: 'protein',
    Grain: 'carbohydrate',
    Vegetable: 'fiber',
    Fruit: 'fiber',
    Fat: 'fat',
    Supplement: 'vitamin',
    Preservative: 'additive',
    Additive: 'additive',
    Mineral: 'mineral',
  }
  return categoryMap[category] ?? 'other'
}

function toDemoHealthImpact(impact: string): string {
  const impactMap: Record<string, string> = {
    positive: 'good',
    neutral: 'neutral',
    negative: 'bad',
  }
  return impactMap[impact] ?? 'neutral'
}

function makeFavoriteAnalysis(score: number) {
  const selectedIngredients = Array.from({ length: 5 }, () => pick(BASE_INGREDIENTS))
  const ingredientNames = selectedIngredients.map((ingredient) => ingredient.nameEn)
  const riskCount = selectedIngredients.filter((ingredient) => ingredient.healthImpact === 'negative').length

  return {
    ingredients: ingredientNames,
    analysis: selectedIngredients.map((ingredient) => ({
      ingredient: ingredient.nameEn,
      category: toDemoCategory(ingredient.category),
      healthImpact: toDemoHealthImpact(ingredient.healthImpact),
      description: `${ingredient.nameEn} is included as a synthetic demo ingredient for query-plan and favorites retrieval testing.`,
    })),
    overallScore: score,
    recommendation:
      riskCount > 0
        ? 'Conclusion: Buy with caution. Suitable for: adult cats without known allergies. Risks: contains one or more lower-quality or sensitive ingredients. How to buy: trial feed gradually and monitor digestion.'
        : 'Conclusion: Recommended. Suitable for: healthy adult cats. Risks: monitor individual allergies. How to buy: transition gradually over 5-7 days.',
    summary:
      riskCount > 0
        ? 'Synthetic demo analysis with a mix of useful and potentially concerning ingredients.'
        : 'Synthetic demo analysis with mostly beneficial or neutral ingredients.',
  }
}

// -------------------------------------------------------------
// Main seed logic
// -------------------------------------------------------------
async function main() {
  const startTs = Date.now()
  console.log('🧹 Cleaning existing data...')
  // Order matters: Favorite → Folder → User → Ingredient (respect FKs)
  await prisma.favorite.deleteMany()
  await prisma.folder.deleteMany()
  await prisma.user.deleteMany()
  await prisma.ingredient.deleteMany()

  // -----------------------------------------------------------
  // 1. Ingredients — 10,000 rows
  // -----------------------------------------------------------
  console.log('🥫 Seeding 10,000 ingredients...')
  const ingredientRows: Array<{
    name: string
    nameEn: string
    aliases: string[]
    category: string
    healthImpact: string
    description: string
    benefits: string[]
    concerns: string[]
    suitableFor: string[]
    notSuitableFor: string[]
    source: string
  }> = []

  // First pass: 50 pure base ingredients (these are the "real" ones users search for)
  for (const base of BASE_INGREDIENTS) {
    ingredientRows.push({
      name: base.name,
      nameEn: base.nameEn,
      aliases: [base.nameEn.toLowerCase(), base.name],
      category: toDemoCategory(base.category),
      healthImpact: toDemoHealthImpact(base.healthImpact),
      description: `${base.nameEn} is a common ingredient in cat food.`,
      benefits: HEALTH_IMPACTS[base.healthImpact].benefits,
      concerns: HEALTH_IMPACTS[base.healthImpact].concerns,
      suitableFor: ['Adult cats'],
      notSuitableFor: [],
      source: 'knowledge_base',
    })
  }

  // Second pass: variants to reach 10,000
  let variantIdx = 0
  while (ingredientRows.length < 10_000) {
    const base = BASE_INGREDIENTS[variantIdx % BASE_INGREDIENTS.length]
    const form = pick(FORMS)
    const grade = pick(GRADES)
    const origin = pick(ORIGINS)
    const suffix = `${form}${grade}${origin}`.trim()
    // Add an index to guarantee uniqueness and predictable distribution
    const uniqueTag = ` #${variantIdx.toString().padStart(5, '0')}`

    ingredientRows.push({
      name: `${base.name}${suffix}${uniqueTag}`,
      nameEn: `${base.nameEn}${suffix}${uniqueTag}`,
      aliases: [base.nameEn.toLowerCase()],
      category: toDemoCategory(base.category),
      healthImpact: toDemoHealthImpact(base.healthImpact),
      description: `Variant of ${base.nameEn} — ${suffix || 'standard form'}.`,
      benefits: HEALTH_IMPACTS[base.healthImpact].benefits,
      concerns: HEALTH_IMPACTS[base.healthImpact].concerns,
      suitableFor: ['Adult cats'],
      notSuitableFor: [],
      source: pick(SOURCES),
    })
    variantIdx++
  }

  // Insert in chunks of 1000 to avoid query-size limits
  for (let i = 0; i < ingredientRows.length; i += 1000) {
    await prisma.ingredient.createMany({
      data: ingredientRows.slice(i, i + 1000),
    })
    process.stdout.write(`  ${Math.min(i + 1000, ingredientRows.length)}/${ingredientRows.length}\r`)
  }
  console.log(`\n  ✅ ${ingredientRows.length} ingredients inserted`)

  // -----------------------------------------------------------
  // 2. Users — 1 demo + 50 synthetic
  // -----------------------------------------------------------
  console.log('👤 Seeding users...')
  const demoPasswordHash = await hashPasswordScrypt('demo551')
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@551.edu',
      passwordHash: demoPasswordHash,
      displayName: 'DSCI 551 Demo User',
    },
  })

  const syntheticPasswordHash = await hashPasswordScrypt('password')
  const syntheticUserData = Array.from({ length: 50 }, (_, i) => ({
    email: `user${(i + 1).toString().padStart(3, '0')}@example.com`,
    passwordHash: syntheticPasswordHash,
    displayName: `User ${i + 1}`,
  }))
  await prisma.user.createMany({ data: syntheticUserData })
  const otherUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'user' } },
    select: { id: true },
  })
  console.log(`  ✅ 1 demo user + ${otherUsers.length} synthetic users`)

  // -----------------------------------------------------------
  // 3. Favorites — 2000 on demo user, 3000 spread across others
  // -----------------------------------------------------------
  console.log('⭐ Seeding 5,000 favorites...')
  const brands = ['Orijen', 'Acana', 'Royal Canin', 'Hills', 'Purina', 'Blue Buffalo', 'Wellness', 'Taste of the Wild']
  const favoriteRows: Array<{
    userId: string
    name: string
    brand: string
    analysis: object
    createdAt: Date
  }> = []

  // Use a wide time range so ORDER BY createdAt has meaningful ordering
  const now = Date.now()
  const yearMs = 365 * 24 * 60 * 60 * 1000

  // 2000 favorites for the demo user
  for (let i = 0; i < 2000; i++) {
    const overallScore = randInt(30, 95) / 10
    favoriteRows.push({
      userId: demoUser.id,
      name: `Cat Food Product ${i + 1}`,
      brand: pick(brands),
      analysis: makeFavoriteAnalysis(overallScore), // 3.0-9.5
      createdAt: new Date(now - Math.floor(rng() * yearMs)),
    })
  }

  // 3000 favorites distributed across the other 50 users
  for (let i = 0; i < 3000; i++) {
    const u = pick(otherUsers)
    const overallScore = randInt(30, 95) / 10
    favoriteRows.push({
      userId: u.id,
      name: `Cat Food Product ${i + 1}`,
      brand: pick(brands),
      analysis: makeFavoriteAnalysis(overallScore), // 3.0-9.5
      createdAt: new Date(now - Math.floor(rng() * yearMs)),
    })
  }

  for (let i = 0; i < favoriteRows.length; i += 1000) {
    await prisma.favorite.createMany({
      data: favoriteRows.slice(i, i + 1000),
    })
    process.stdout.write(`  ${Math.min(i + 1000, favoriteRows.length)}/${favoriteRows.length}\r`)
  }
  console.log(`\n  ✅ ${favoriteRows.length} favorites inserted`)

  // -----------------------------------------------------------
  // 4. ANALYZE — refresh planner statistics so EXPLAIN is accurate
  // -----------------------------------------------------------
  console.log('📊 Running ANALYZE to refresh planner statistics...')
  await prisma.$executeRawUnsafe('ANALYZE "Ingredient"')
  await prisma.$executeRawUnsafe('ANALYZE "Favorite"')
  await prisma.$executeRawUnsafe('ANALYZE "User"')

  const elapsed = ((Date.now() - startTs) / 1000).toFixed(1)
  console.log(`\n✅ Seed complete in ${elapsed}s`)
  console.log('\n📋 Summary:')
  console.log(`  Ingredients: ${await prisma.ingredient.count()}`)
  console.log(`  Users:       ${await prisma.user.count()}`)
  console.log(`  Favorites:   ${await prisma.favorite.count()}`)
  console.log(`\n🔑 Demo credentials:`)
  console.log(`  email:    demo@551.edu`)
  console.log(`  password: demo551`)
  console.log(`  user id:  ${demoUser.id}`)
}

async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
