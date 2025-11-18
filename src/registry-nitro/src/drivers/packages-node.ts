import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/libsql.ts'
import * as schema from '../db/schema.ts'

export default definePackagesDriver(getDb, schema)
