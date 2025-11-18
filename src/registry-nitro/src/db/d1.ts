// eslint-disable-next-line import/no-unresolved -- ESLint's import plugin doesn't recognize .d.mts type declaration files
import cloudflareD1 from 'db0/connectors/cloudflare-d1'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema.ts'

export const getDb = () =>
  drizzle(
    cloudflareD1({
      bindingName: 'DB',
    }).getInstance(),
    { schema },
  )
