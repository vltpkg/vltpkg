import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema-pg.ts'

const db = drizzle(process.env.NEON_DATABASE_URL!, { schema })

export const getDb = () => db
