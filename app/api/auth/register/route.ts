import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/session'
import { checkRateLimit, clearAttempts, recordFailedAttempt } from '@/lib/auth/rate-limit'
import { isAdminUser } from '@/lib/auth/admin'

interface RegisterBody {
  email?: string
  password?: string
  displayName?: string
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const displayName = body.displayName?.trim() || null
    const ip = getClientIp(request)
    const ipKey = `register:ip:${ip}`
    const emailKey = `register:email:${email ?? 'unknown'}`

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

    if (!isValidEmail(email)) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (password.length < 8) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      recordFailedAttempt(ipKey, RATE_LIMIT_WINDOW_MS)
      recordFailedAttempt(emailKey, RATE_LIMIT_WINDOW_MS)
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    })

    await setSessionCookie(user.id, user.email)
    clearAttempts(ipKey)
    clearAttempts(emailKey)

    return NextResponse.json({
      user: {
        ...user,
        isAdmin: isAdminUser(user),
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Sign up failed. Please try again later.' }, { status: 500 })
  }
}
