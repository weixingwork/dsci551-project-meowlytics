import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/session'
import { checkRateLimit, clearAttempts, recordFailedAttempt } from '@/lib/auth/rate-limit'
import { isAdminUser } from '@/lib/auth/admin'

interface LoginBody {
  email?: string
  password?: string
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_ATTEMPTS = 5

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const ip = getClientIp(request)
    const ipKey = `login:ip:${ip}`
    const emailKey = `login:email:${email ?? 'unknown'}`

    for (const key of [ipKey, emailKey]) {
      const status = checkRateLimit(key, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS)
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

    if (!email || !password) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    await setSessionCookie(user.id, user.email)
    clearAttempts(ipKey)
    clearAttempts(emailKey)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        isAdmin: isAdminUser(user),
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Sign in failed. Please try again later.' }, { status: 500 })
  }
}
