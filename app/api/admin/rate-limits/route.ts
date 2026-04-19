import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/require-user'
import { isAdminUser } from '@/lib/auth/admin'
import { getRateLimitConfig, updateRateLimitConfig } from '@/lib/auth/rate-limit-config'

interface UpdateRateLimitBody {
  analyzeIpPerMinute?: number
  analyzeUserPerDay?: number
  forgotPerIpPerMinute?: number
  forgotEmailCooldownSeconds?: number
}

export async function GET() {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
  }

  const config = await getRateLimitConfig()
  return NextResponse.json({ config })
}

export async function PATCH(request: Request) {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) {
    return errorResponse
  }
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as UpdateRateLimitBody
    const updates: Partial<UpdateRateLimitBody> = {}

    for (const key of [
      'analyzeIpPerMinute',
      'analyzeUserPerDay',
      'forgotPerIpPerMinute',
      'forgotEmailCooldownSeconds',
    ] as const) {
      if (body[key] !== undefined) {
        const parsed = Number(body[key])
        if (!Number.isFinite(parsed)) {
          return NextResponse.json({ error: `${key} must be a number` }, { status: 400 })
        }
        updates[key] = parsed
      }
    }

    const config = await updateRateLimitConfig(updates)
    return NextResponse.json({ config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update rate limit config'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
