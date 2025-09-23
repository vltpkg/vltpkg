import { definePackagesDriver } from './packages.ts'
import { getDb } from '../db/d1.ts'

export default definePackagesDriver(getDb)
