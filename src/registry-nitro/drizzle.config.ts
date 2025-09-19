import { defineConfig } from 'drizzle-kit'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

mkdirSync(resolve(process.cwd(), '.data'), {
  recursive: true,
})

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:.data/db.sqlite',
  },
})
