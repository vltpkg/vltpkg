import { drizzle } from 'drizzle-orm/neon-http'

const db = drizzle(process.env.DATABASE_URL!)

export const getDb = () => db
