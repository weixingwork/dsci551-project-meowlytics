import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/require-user'
import { AnalysisResult } from '@/app/(main)/types'
import { isValidAnalysisResult } from '@/lib/validation/analysis'

interface CreateFavoriteBody {
  name?: string
  brand?: string
  imageData?: string
  analysis?: AnalysisResult
  notes?: string
  folderId?: string
}

function toFavoriteDto(record: {
  id: string
  name: string
  brand: string | null
  imageData: string | null
  analysis: unknown
  notes: string | null
  folderId: string | null
  createdAt: Date
}) {
  return {
    id: record.id,
    name: record.name,
    brand: record.brand ?? undefined,
    imageData: record.imageData ?? undefined,
    analysis: record.analysis as AnalysisResult,
    notes: record.notes ?? undefined,
    folderId: record.folderId ?? undefined,
    createdAt: record.createdAt.toISOString(),
  }
}

export async function GET() {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ favorites: favorites.map(toFavoriteDto) })
}

export async function POST(request: Request) {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as CreateFavoriteBody
    const name = body.name?.trim()

    if (!name || !body.analysis) {
      return NextResponse.json({ error: 'Favorite name and analysis result are required' }, { status: 400 })
    }
    if (!isValidAnalysisResult(body.analysis)) {
      return NextResponse.json({ error: 'Invalid analysis result format' }, { status: 400 })
    }

    if (body.folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: body.folderId, userId: user.id },
      })
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
      }
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        name,
        brand: body.brand?.trim() || null,
        imageData: body.imageData || null,
        analysis: body.analysis as unknown as Prisma.InputJsonValue,
        notes: body.notes?.trim() || null,
        folderId: body.folderId || null,
      },
    })

    return NextResponse.json({ favorite: toFavoriteDto(favorite) }, { status: 201 })
  } catch (error) {
    console.error('Create favorite error:', error)
    return NextResponse.json({ error: 'Failed to save favorite. Please try again later.' }, { status: 500 })
  }
}
