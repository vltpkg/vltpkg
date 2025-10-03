import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/turso.ts'

export default definePackagesDriver(getDb)
