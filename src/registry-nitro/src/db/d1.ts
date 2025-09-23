import cloudflareD1 from 'db0/connectors/cloudflare-d1'
import { drizzle } from 'drizzle-orm/d1'

export const getDb = () =>
  drizzle(
    cloudflareD1({
      bindingName: 'DB',
    }).getInstance(),
  )
