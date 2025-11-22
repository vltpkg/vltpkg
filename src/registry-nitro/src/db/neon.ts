import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import * as schema from './schema-pg.ts'

export type Database = NeonHttpDatabase<typeof schema>

export type Context = {
  dialect: 'pg'
  db: Database
  schema: typeof schema
  $client: NeonQueryFunction<false, false>
}

let ctx: Context | null = null

export default (url: string): Context => {
  if (ctx) {
    return ctx
  }
  const neonClient = neon(url)
  const client = drizzle(neonClient, { schema })
  ctx = { dialect: 'pg', db: client, schema, $client: neonClient }
  return ctx
}
