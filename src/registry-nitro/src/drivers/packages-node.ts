import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/libsql.ts'

export default definePackagesDriver(getDb)
