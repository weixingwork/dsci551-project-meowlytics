import { prisma } from '@/lib/db'
import { IngredientKnowledge } from './types'

// AI 生成数据的有效期（30天）
const AI_DATA_EXPIRY_DAYS = 30

/**
 * 将数据库记录转换为 IngredientKnowledge 类型
 */
function toIngredientKnowledge(record: {
  id: string
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
  updatedAt: Date
}): IngredientKnowledge {
  return {
    id: record.id,
    name: record.name,
    nameEn: record.nameEn,
    aliases: record.aliases,
    category: record.category as IngredientKnowledge['category'],
    healthImpact: record.healthImpact as IngredientKnowledge['healthImpact'],
    description: record.description,
    benefits: record.benefits,
    concerns: record.concerns,
    suitableFor: record.suitableFor,
    notSuitableFor: record.notSuitableFor,
    source: record.source as IngredientKnowledge['source'],
    lastUpdated: record.updatedAt.toISOString().split('T')[0],
  }
}

/**
 * 检查 AI 生成的数据是否过期
 */
function isAIDataExpired(updatedAt: Date): boolean {
  const now = new Date()
  const diffTime = now.getTime() - updatedAt.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays > AI_DATA_EXPIRY_DAYS
}

/**
 * 计算字符串相似度（0-1）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // 精确匹配
  if (s1 === s2) return 1

  // 包含匹配
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length <= s2.length ? s1 : s2
    return shorter.length / longer.length
  }

  // 字符重叠计数
  let matches = 0
  const chars1 = s1.split('')
  const chars2 = s2.split('')

  for (const char of chars1) {
    if (chars2.includes(char)) {
      matches++
    }
  }

  return matches / Math.max(chars1.length, chars2.length)
}

export interface SearchResult {
  ingredient: IngredientKnowledge
  needsRefresh: boolean // AI 数据已过期，需要刷新
}

/**
 * 从数据库搜索配料
 * 搜索顺序：精确匹配 → 别名匹配 → 模糊匹配
 */
export async function searchIngredientFromDB(
  query: string,
  threshold: number = 0.5
): Promise<SearchResult | null> {
  if (!query || query.trim() === '') return null

  const normalizedQuery = query.toLowerCase().trim()
  let allIngredients: Awaited<ReturnType<typeof prisma.ingredient.findMany>> | null = null

  // 1. 精确匹配中文名
  let ingredient = await prisma.ingredient.findFirst({
    where: {
      name: query.trim(),
    },
  })

  // 2. 精确匹配英文名
  if (!ingredient) {
    ingredient = await prisma.ingredient.findFirst({
      where: {
        nameEn: query.trim(),
      },
    })
  }

  // 3. 别名匹配（PostgreSQL 数组包含查询）
  if (!ingredient) {
    ingredient = await prisma.ingredient.findFirst({
      where: {
        aliases: {
          has: query.trim(),
        },
      },
    })
  }

  // 4. 别名模糊匹配（大小写不敏感）
  if (!ingredient) {
    allIngredients = allIngredients ?? await prisma.ingredient.findMany()
    for (const ing of allIngredients) {
      const hasMatchingAlias = ing.aliases.some(
        (alias) => alias.toLowerCase() === normalizedQuery
      )
      if (hasMatchingAlias) {
        ingredient = ing
        break
      }
    }
  }

  // 5. 模糊匹配
  if (!ingredient) {
    allIngredients = allIngredients ?? await prisma.ingredient.findMany()
    let bestMatch: (typeof allIngredients)[number] | null = null
    let bestScore = threshold

    for (const ing of allIngredients) {
      const nameScore = calculateSimilarity(ing.name, normalizedQuery)
      const nameEnScore = calculateSimilarity(ing.nameEn, normalizedQuery)

      let aliasScore = 0
      for (const alias of ing.aliases) {
        const score = calculateSimilarity(alias, normalizedQuery)
        aliasScore = Math.max(aliasScore, score)
      }

      const maxScore = Math.max(nameScore, nameEnScore, aliasScore)

      if (maxScore > bestScore) {
        bestScore = maxScore
        bestMatch = ing
      }
    }

    ingredient = bestMatch
  }

  if (!ingredient) return null

  const result = toIngredientKnowledge(ingredient)
  const needsRefresh =
    ingredient.source === 'ai_generated' && isAIDataExpired(ingredient.updatedAt)

  return {
    ingredient: result,
    needsRefresh,
  }
}

/**
 * 保存 AI 生成的配料到数据库
 */
export async function saveAIGeneratedIngredient(
  data: Omit<IngredientKnowledge, 'id' | 'source' | 'lastUpdated'>
): Promise<IngredientKnowledge> {
  const ingredient = await prisma.ingredient.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      aliases: data.aliases,
      category: data.category,
      healthImpact: data.healthImpact,
      description: data.description,
      benefits: data.benefits,
      concerns: data.concerns,
      suitableFor: data.suitableFor,
      notSuitableFor: data.notSuitableFor,
      source: 'ai_generated',
    },
  })

  return toIngredientKnowledge(ingredient)
}

/**
 * 更新过期的 AI 生成配料
 */
export async function updateAIGeneratedIngredient(
  id: string,
  data: Omit<IngredientKnowledge, 'id' | 'source' | 'lastUpdated'>
): Promise<IngredientKnowledge> {
  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      name: data.name,
      nameEn: data.nameEn,
      aliases: data.aliases,
      category: data.category,
      healthImpact: data.healthImpact,
      description: data.description,
      benefits: data.benefits,
      concerns: data.concerns,
      suitableFor: data.suitableFor,
      notSuitableFor: data.notSuitableFor,
      // updatedAt 会自动更新
    },
  })

  return toIngredientKnowledge(ingredient)
}

/**
 * 获取所有配料
 */
export async function getAllIngredientsFromDB(): Promise<IngredientKnowledge[]> {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  })

  return ingredients.map(toIngredientKnowledge)
}

/**
 * 按分类获取配料
 */
export async function getIngredientsByCategoryFromDB(
  category: IngredientKnowledge['category']
): Promise<IngredientKnowledge[]> {
  const ingredients = await prisma.ingredient.findMany({
    where: { category },
    orderBy: { name: 'asc' },
  })

  return ingredients.map(toIngredientKnowledge)
}

/**
 * 按 ID 获取配料
 */
export async function getIngredientByIdFromDB(
  id: string
): Promise<IngredientKnowledge | null> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
  })

  if (!ingredient) return null

  return toIngredientKnowledge(ingredient)
}

/**
 * 批量插入或更新配料（用于知识库导入）
 */
export async function upsertIngredients(
  ingredients: Array<Omit<IngredientKnowledge, 'id' | 'lastUpdated'> & { id?: string }>
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const ing of ingredients) {
    // 先检查是否存在同名配料
    const existing = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: { equals: ing.name, mode: 'insensitive' } },
          { nameEn: { equals: ing.nameEn, mode: 'insensitive' } },
        ],
      },
    })

    if (existing) {
      await prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          name: ing.name,
          nameEn: ing.nameEn,
          aliases: ing.aliases,
          category: ing.category,
          healthImpact: ing.healthImpact,
          description: ing.description,
          benefits: ing.benefits,
          concerns: ing.concerns,
          suitableFor: ing.suitableFor,
          notSuitableFor: ing.notSuitableFor,
          source: ing.source,
        },
      })
      updated++
    } else {
      await prisma.ingredient.create({
        data: {
          name: ing.name,
          nameEn: ing.nameEn,
          aliases: ing.aliases,
          category: ing.category,
          healthImpact: ing.healthImpact,
          description: ing.description,
          benefits: ing.benefits,
          concerns: ing.concerns,
          suitableFor: ing.suitableFor,
          notSuitableFor: ing.notSuitableFor,
          source: ing.source,
        },
      })
      created++
    }
  }

  return { created, updated }
}
