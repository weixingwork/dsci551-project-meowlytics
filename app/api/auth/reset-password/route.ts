import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import {
  isPasswordResetStampValid,
  verifyPasswordResetToken,
} from '@/lib/auth/password-reset'
import { setSessionCookie } from '@/lib/auth/session'

interface ResetPasswordBody {
  token?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordBody
    const token = body.token?.trim()
    const password = body.password

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const payload = verifyPasswordResetToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, passwordHash: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    if (!isPasswordResetStampValid(user.passwordHash, payload.stamp)) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    await setSessionCookie(user.id, user.email)

    return NextResponse.json({
      message: 'Password reset successful. You are now signed in.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password. Please try again later.' }, { status: 500 })
  }
}
