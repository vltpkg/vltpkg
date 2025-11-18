import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema.ts'

export const getDb = () =>
  drizzle(
    createClient({
      url: 'file:.data/db.sqlite',
    }),
    { schema },
  )
