import { defineConfig } from 'drizzle-kit'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'

// Find the actual SQLite database file in the miniflare-D1DatabaseObject directory
let dbPath = './local.db' // Fallback
const miniflareDir = join(
  './local-store',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject',
)

if (existsSync(miniflareDir)) {
  // Look for the most recently modified SQLite file
  const files = readdirSync(miniflareDir)
    .filter(file => file.endsWith('.sqlite'))
    .map(file => {
      const fullPath = join(miniflareDir, file)
      return { file, fullPath }
    })

  if (files.length > 0) {
    // Just use the first file if there's only one
    dbPath = files[0].fullPath
    console.log('Using D1 database at:', dbPath)
  }
}

// For Drizzle Kit
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
})
