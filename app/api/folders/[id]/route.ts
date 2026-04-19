import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/require-user'

interface UpdateFolderBody {
  name?: string
  color?: string
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
    const existing = await prisma.folder.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const body = (await request.json()) as UpdateFolderBody

    const name = body.name?.trim()
    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 })
    }
    if (name && name.length > 20) {
      return NextResponse.json({ error: 'Folder name cannot exceed 20 characters' }, { status: 400 })
    }

    await prisma.folder.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        color: body.color ?? existing.color,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update folder error:', error)
    return NextResponse.json({ error: 'Failed to update folder. Please try again later.' }, { status: 500 })
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
    const existing = await prisma.folder.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    await prisma.folder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json({ error: 'Failed to delete folder. Please try again later.' }, { status: 500 })
  }
}
