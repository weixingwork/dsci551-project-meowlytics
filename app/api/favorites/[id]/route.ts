import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/require-user'

interface UpdateFavoriteBody {
  name?: string
  brand?: string
  imageData?: string
  notes?: string
  folderId?: string | null
}

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.favorite.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    const body = (await request.json()) as UpdateFavoriteBody

    const data: Record<string, unknown> = {
      name: body.name?.trim() ?? existing.name,
      brand: body.brand?.trim() || null,
      imageData: body.imageData || existing.imageData,
      notes: body.notes?.trim() || null,
    }

    if (body.folderId !== undefined) {
      if (body.folderId === null) {
        data.folderId = null
      } else {
        const folder = await prisma.folder.findFirst({
          where: { id: body.folderId, userId: user.id },
        })
        if (!folder) {
          return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
        }
        data.folderId = body.folderId
      }
    }

    await prisma.favorite.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update favorite error:', error)
    return NextResponse.json({ error: 'Failed to update favorite. Please try again later.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.favorite.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    await prisma.favorite.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete favorite error:', error)
    return NextResponse.json({ error: 'Failed to delete favorite. Please try again later.' }, { status: 500 })
  }
}
