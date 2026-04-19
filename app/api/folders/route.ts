import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/require-user'

interface CreateFolderBody {
  name?: string
  color?: string
}

export async function GET() {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { favorites: true },
      },
    },
  })

  return NextResponse.json({
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      createdAt: folder.createdAt.toISOString(),
      favoriteCount: folder._count.favorites,
    })),
  })
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
    const body = (await request.json()) as CreateFolderBody
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 })
    }
    if (name.length > 20) {
      return NextResponse.json({ error: 'Folder name cannot exceed 20 characters' }, { status: 400 })
    }

    const folderCount = await prisma.folder.count({
      where: { userId: user.id },
    })
    if (folderCount >= 20) {
      return NextResponse.json({ error: 'You can create at most 20 folders' }, { status: 400 })
    }

    const folder = await prisma.folder.create({
      data: {
        userId: user.id,
        name,
        color: body.color || '#f97316',
      },
    })

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        createdAt: folder.createdAt.toISOString(),
        favoriteCount: 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create folder error:', error)
    return NextResponse.json({ error: 'Failed to create folder. Please try again later.' }, { status: 500 })
  }
}
