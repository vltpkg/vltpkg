import { drizzle } from 'drizzle-orm/libsql'

export const getDb = () =>
  drizzle({
    connection: {
      url: 'file:.data/db.sqlite',
    },
  })
