import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema-postgres.ts'

const db = drizzle(process.env.NEON_DATABASE_URL!, { schema })

export const getDb = () => db
