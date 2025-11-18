import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/d1.ts'
import * as schema from '../db/schema.ts'

export default definePackagesDriver(getDb, schema)
