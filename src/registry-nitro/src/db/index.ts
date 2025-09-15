import { createDatabase } from 'db0'
import libSql from 'db0/connectors/libsql/node'
import { drizzle } from 'db0/integrations/drizzle'

const db0 = createDatabase(libSql({ url: 'file:db.sqlite' }))
export const db = drizzle(db0)
