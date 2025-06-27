import { createDatabaseOperations } from '../db/client.ts'
import type { D1Database } from '@cloudflare/workers-types'
import type { DatabaseOperations } from '../../types.ts'

/**
 * Creates database operations instance from D1 database
 * @param d1 - The D1 database instance
 * @returns Database operations interface
 */
export function createDB(d1: D1Database) {
  return createDatabaseOperations(d1)
}

/**
 * Type guard to check if database is available
 * @param db - The database instance to check
 * @returns True if database is available and functional
 */
export function isDatabaseAvailable(db: any): db is DatabaseOperations {
  return db && typeof db.getPackage === 'function'
}

// Cache the database operations to avoid recreating on every request
let cachedDbOperations: any = null

/**
 * Middleware to mount database operations on the context
 * @param c - The Hono context
 * @param next - The next middleware function
 */
export async function mountDatabase(c: any, next: any) {
  if (!c.env.DB) {
    throw new Error('Database not found in environment')
  }

  // Reuse existing database operations if available
  if (!cachedDbOperations) {
    console.log('[DB] Creating new database operations instance')
    cachedDbOperations = createDatabaseOperations(c.env.DB)
  }

  c.db = cachedDbOperations as any
  await next()
}
