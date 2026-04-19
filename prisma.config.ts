import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

const config = {
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: async () => {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      })
      return new PrismaPg(pool)
    },
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig(config as any)