import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import type { Config } from 'drizzle-kit'
import assert from 'node:assert'

const getAndAssert = (name: string) => {
  const value = process.env[name]
  assert(value, `Environment variable ${name} is required`)
  return value
}

const { VSR_DATABASE } = process.env

const config =
  VSR_DATABASE === 'neon' ?
    ({
      dialect: 'postgresql',
      schema: './src/db/schema-pg.ts',
      dbCredentials: {
        url: getAndAssert('VSR_NEON_DATABASE_URL'),
      },
    } satisfies Config)
  : VSR_DATABASE === 'sqlite' ?
    ({
      dialect: 'sqlite',
      schema: './src/db/schema-sqlite.ts',
      dbCredentials: {
        url: getAndAssert('VSR_SQLITE_DATABASE_FILE_NAME'),
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
