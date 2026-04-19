interface EnvShape {
  DATABASE_URL: string;
  GOOGLE_API_KEY: string;
  AUTH_SECRET: string;
  ADMIN_EMAILS: string[];
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function validateAuthSecret(secret: string): void {
  if (secret.length < 16) {
    throw new Error("[env] AUTH_SECRET must be at least 16 characters");
  }
}

function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv) {
    validateAuthSecret(fromEnv);
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("[env] Missing required environment variable: AUTH_SECRET");
  }

  // Keep local development unblocked while still warning explicitly.
  const devFallback = "dev-only-auth-secret-change-me";
  console.warn(
    "[env] AUTH_SECRET is missing; using development fallback secret. Set AUTH_SECRET in .env.local."
  );
  return devFallback;
}

function buildEnv(): EnvShape {
  const DATABASE_URL = getRequiredEnv("DATABASE_URL");
  const GOOGLE_API_KEY = getRequiredEnv("GOOGLE_API_KEY");
  const AUTH_SECRET = getAuthSecret();
  const ADMIN_EMAILS = parseAdminEmails(process.env.ADMIN_EMAILS);

  return {
    DATABASE_URL,
    GOOGLE_API_KEY,
    AUTH_SECRET,
    ADMIN_EMAILS,
  };
}

export const env = buildEnv();
