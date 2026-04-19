import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, recordFailedAttempt } from '@/lib/auth/rate-limit'
import { consumePasswordResetSend } from '@/lib/auth/password-reset-throttle'
import { getRateLimitConfig } from '@/lib/auth/rate-limit-config'
import { createPasswordResetToken } from '@/lib/auth/password-reset'
import { sendPasswordResetEmail } from '@/lib/auth/reset-email'

interface ForgotPasswordBody {
  email?: string
}

const RATE_LIMIT_WINDOW_MS = 60_000

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getAppBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export async function POST(request: Request) {
  try {
    const rateLimits = await getRateLimitConfig()
    const body = (await request.json()) as ForgotPasswordBody
    const email = body.email?.trim().toLowerCase()
    const ip = getClientIp(request)
    const ipKey = `forgot:ip:${ip}`
    const emailKey = `forgot:email:${email ?? 'unknown'}`

    for (const key of [ipKey, emailKey]) {
      const status = checkRateLimit(key, rateLimits.forgotPerIpPerMinute, RATE_LIMIT_WINDOW_MS)
      if (status.limited) {
        return NextResponse.json(
          { error: `Too many requests. Please try again in ${status.retryAfterSeconds} seconds.` },
          {
            status: 429,
            headers: { 'Retry-After': String(status.retryAfterSeconds) },
          }
        )
      }
    }

    if (!email || !isValidEmail(email)) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const cooldown = await consumePasswordResetSend(email, rateLimits.forgotEmailCooldownSeconds)
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Too many requests for this email. Please try again in ${cooldown.retryAfterSeconds} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(cooldown.retryAfterSeconds) },
        }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    })

    if (user) {
      const token = createPasswordResetToken(user.id, user.passwordHash)
      const resetLink = `${getAppBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`
      await sendPasswordResetEmail({ to: user.email, resetLink })
    }

    return NextResponse.json({
      message: 'If this email is registered, a password reset link has been sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send reset email. Please try again later.' }, { status: 500 })
  }
}
