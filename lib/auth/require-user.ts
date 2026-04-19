import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'

export async function requireUser() {
  const user = await getSessionUser()

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: '请先登录' }, { status: 401 }),
    }
  }

  return { user, errorResponse: null }
}
