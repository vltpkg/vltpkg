import { createDatabaseOperations } from '../db/client.ts'
import type { D1Database } from '@cloudflare/workers-types'
import type { DatabaseOperations, HonoContext } from '../../types.ts'

/**
 * Creates database operations instance from D1 database
 * @param {D1Database} d1 - The D1 database instance
 * @returns {DatabaseOperations} Database operations interface
 */
export function createDB(d1: D1Database): DatabaseOperations {
  return createDatabaseOperations(d1)
}

/**
 * Type guard to check if database is available
 * @param {unknown} db - The database instance to check
 * @returns {boolean} True if database is available and functional
 */
export function isDatabaseAvailable(
  db: unknown,
): db is DatabaseOperations {
  return (
    typeof db === 'object' &&
    db !== null &&
    'getPackage' in db &&
    typeof (db as DatabaseOperations).getPackage === 'function'
  )
}

// Cache the database operations to avoid recreating on every request
let cachedDbOperations: DatabaseOperations | null = null

/**
 * Middleware to mount database operations on the context
 * @param {HonoContext} c - The Hono context
 * @param {() => Promise<void>} next - The next middleware function
 */
export async function mountDatabase(
  c: HonoContext,
  next: () => Promise<void>,
): Promise<void> {
  if (!c.env.DB) {
    throw new Error('Database not found in environment')
  }

  // Reuse existing database operations if available
  cachedDbOperations ??= createDatabaseOperations(
    c.env.DB as D1Database,
  ) as DatabaseOperations

  c.set('db', cachedDbOperations)
  await next()
}
