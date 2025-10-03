import { defineConfig } from 'drizzle-kit'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

mkdirSync(resolve(process.cwd(), '.data'), {
  recursive: true,
})

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(process.env.DATABASE_URL ?
    {
      dialect: 'turso',
      dbCredentials: {
        url: process.env.DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      },
    }
  : {
      dialect: 'sqlite',
      dbCredentials: {
        url: 'file:.data/db.sqlite',
      },
    }),
})
