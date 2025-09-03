import { defineConfig } from 'drizzle-kit'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'

// Find the actual SQLite database file in the miniflare-D1DatabaseObject directory
const miniflareDir = join(
  import.meta.dirname,
  './local-store',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject',
)

if (!existsSync(miniflareDir)) {
  throw new Error(
    `Miniflare directory not found at ${miniflareDir}. Make sure to run \`pnpm run db:setup\` first.`,
  )
}
// Look for the most recently modified SQLite file
const file = readdirSync(miniflareDir, { withFileTypes: true })
  .filter(file => file.isFile() && file.name.endsWith('.sqlite'))
  .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  .map(file => join(file.parentPath, file.name))
  .find(file => existsSync(file))

if (!file) {
  throw new Error(
    `No SQLite file found in ${miniflareDir}. Make sure to run \`pnpm run db:setup\` first.`,
  )
}

// For Drizzle Kit
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: file,
  },
})
