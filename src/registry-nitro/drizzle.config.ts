import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import type { Config } from 'drizzle-kit'

const config =
  process.env.NEON_DATABASE_URL ?
    ({
      dialect: 'postgresql',
      schema: './src/db/schema-pg.ts',
      dbCredentials: {
        url: process.env.NEON_DATABASE_URL,
      },
    } satisfies Config)
  : process.env.SQLITE_DATABASE_FILE_NAME ?
    ({
      dialect: 'sqlite',
      schema: './src/db/schema-sqlite.ts',
      dbCredentials: {
        url: process.env.SQLITE_DATABASE_FILE_NAME,
      },
    } satisfies Config)
  : null

if (!config) {
  throw new Error('No database URL provided')
}

export default defineConfig({
  out: './drizzle',
  ...config,
})
