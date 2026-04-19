import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'

const PASSWORD_RESET_TTL_SECONDS = 60 * 30

interface PasswordResetPayload {
  sub: string
  exp: number
  stamp: string
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, 'base64').toString('utf-8')
}

function sign(message: string): string {
  return createHmac('sha256', env.AUTH_SECRET).update(message).digest('base64url')
}

function isSameSignature(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

function createPasswordStamp(passwordHash: string): string {
  return createHmac('sha256', env.AUTH_SECRET)
    .update(passwordHash)
    .digest('base64url')
    .slice(0, 32)
}

export function createPasswordResetToken(userId: string, passwordHash: string): string {
  const payload: PasswordResetPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + PASSWORD_RESET_TTL_SECONDS,
    stamp: createPasswordStamp(passwordHash),
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload | null {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSig = sign(encodedPayload)
  if (!isSameSignature(signature, expectedSig)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as PasswordResetPayload
    if (!payload.sub || !payload.exp || !payload.stamp) {
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function isPasswordResetStampValid(passwordHash: string, stamp: string): boolean {
  return isSameSignature(stamp, createPasswordStamp(passwordHash))
}
