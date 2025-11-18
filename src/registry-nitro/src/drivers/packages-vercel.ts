import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/neon.ts'
import * as schema from '../db/schema-postgres.ts'

export default definePackagesDriver(getDb, schema)
