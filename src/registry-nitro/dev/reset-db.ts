#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import 'dotenv/config'
import { sql } from 'drizzle-orm'
import getDb from '../src/db/neon.ts'

const url = process.env.NEON_DATABASE_URL

if (!url) {
  console.error('NEON_DATABASE_URL is not set')
  process.exit(1)
}

const db = getDb(url)

async function run() {
  console.log('Truncating tables: packages, versions, tarballs...')
  await db.execute(
    sql`TRUNCATE TABLE packages, versions, tarballs CASCADE`,
  )
  console.log('Tables truncated.')
  process.exit(0)
}

run().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
