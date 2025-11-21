import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema-sqlite.ts'

export type Database = LibSQLDatabase<typeof schema>

export type Context = {
  dialect: 'sqlite'
  db: Database
  schema: typeof schema
  $client: Client
}

let ctx: Context | null = null

export default (url: string): Context => {
  if (ctx) {
    return ctx
  }
  const libSqlClient = createClient({ url })
  const client = drizzle(libSqlClient, { schema })
  ctx = {
    dialect: 'sqlite',
    db: client,
    schema,
    $client: libSqlClient,
  }
  return ctx
}
