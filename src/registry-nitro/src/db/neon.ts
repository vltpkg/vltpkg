import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

let singleton: ReturnType<typeof drizzle> | null = null

export default (url: string) => {
  if (singleton) {
    return singleton
  }
  const client = neon(url)
  singleton = drizzle({ client })
  return singleton
}
