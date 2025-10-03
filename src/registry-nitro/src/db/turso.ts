import { drizzle } from 'drizzle-orm/libsql'

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})

export const getDb = () => db
