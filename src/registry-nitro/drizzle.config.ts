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
    // url: 'file:.data/db.sqlite',
    // url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d8eb26883a22be6065ba3b9c035545b7854a948f0ca1e302cd2fa25049911f26.sqlite',
    url: 'file:.wrangler/state/v3/r2/miniflare-R2BucketObject/de77a42539c82e911ec62bc02a1d640573a220c493e59177f18fcd82ff1e58b2.sqlite',
  },
})
