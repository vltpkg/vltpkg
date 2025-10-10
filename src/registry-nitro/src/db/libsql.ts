import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({
  url: 'file:.data/db.sqlite',
})

export const getDb = () => drizzle(client)
