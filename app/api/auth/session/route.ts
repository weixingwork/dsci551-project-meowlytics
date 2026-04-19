import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { isAdminUser } from '@/lib/auth/admin'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      ...user,
      isAdmin: isAdminUser(user),
    },
  })
}
