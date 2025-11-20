import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

let singleton: ReturnType<typeof drizzle> | null = null

export default (url: string) => {
  if (singleton) {
    return singleton
  }
  const client = createClient({ url })
  singleton = drizzle({ client })
  return singleton
}
