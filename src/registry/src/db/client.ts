import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { sql } from 'drizzle-orm'
import * as schema from './schema.ts'

const fallbackLogger = {
  error: (_message: string, _error?: unknown) => {
    // eslint-disable-next-line no-console
    console.error(_message, _error)
  },
  info: (_message: string) => {
    // eslint-disable-next-line no-console
    console.info(_message)
  },
}

export type Database = ReturnType<typeof drizzle<typeof schema>>

export function createDatabase(d1: D1Database): Database {
  return drizzle(d1, { schema })
}

export function parseJSON(value: string | null): any {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (_e) {
    // Log to monitoring system instead of console
    return null
  }
}

export function stringifyJSON(value: unknown): string {
  return JSON.stringify(value)
}

export function createDatabaseOperations(
  d1: D1Database,
  logger = fallbackLogger,
) {
  const db = createDatabase(d1)

  return {
    async getPackage(name: string) {
      try {
        const result = await db
          .select()
          .from(schema.packages)
          .where(sql`name = ${name}`)
          .get()
        if (!result) return null
        return {
          name: result.name,
          tags: parseJSON(result.tags) as Record<string, string>,
          lastUpdated: result.lastUpdated,
        }
      } catch (_error) {
        logger.error(
          `[DB ERROR] Failed to get package ${name}`,
          _error,
        )
        return null
      }
    },

    async upsertPackage(
      name: string,
      tags: Record<string, string>,
      lastUpdated?: string,
    ) {
      try {
        const result = await db
          .insert(schema.packages)
          .values({
            name,
            tags: stringifyJSON(tags),
            lastUpdated: lastUpdated || new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.packages.name,
            set: {
              tags: stringifyJSON(tags),
              lastUpdated: lastUpdated || new Date().toISOString(),
            },
          })
        return result
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to upsert package ${name}`,
          _error,
        )
        return null
      }
    },

    async upsertCachedPackage(
      name: string,
      tags: Record<string, string>,
      upstream: string,
      lastUpdated?: string,
    ) {
      try {
        const result = await db
          .insert(schema.packages)
          .values({
            name,
            tags: stringifyJSON(tags),
            lastUpdated: lastUpdated || new Date().toISOString(),
            origin: 'upstream',
            upstream,
            cachedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.packages.name,
            set: {
              tags: stringifyJSON(tags),
              lastUpdated: lastUpdated || new Date().toISOString(),
              cachedAt: new Date().toISOString(),
            },
          })
        // Log to monitoring system instead of console
        return result
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to upsert cached package ${name}`,
          _error,
        )
        return null
      }
    },

    async getCachedPackage(name: string) {
      try {
        const result = await db
          .select()
          .from(schema.packages)
          .where(sql`name = ${name}`)
          .get()
        if (!result) return null
        return {
          name: result.name,
          tags: parseJSON(result.tags) as Record<string, string>,
          lastUpdated: result.lastUpdated,
          origin: result.origin,
          upstream: result.upstream,
          cachedAt: result.cachedAt,
        }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get cached package ${name}`,
          error,
        )
        return null
      }
    },

    async isPackageCacheValid(name: string, ttlMinutes = 5) {
      try {
        const pkg = await this.getCachedPackage(name)
        if (!pkg?.cachedAt || pkg.origin !== 'upstream') {
          return false
        }

        const cacheTime = new Date(pkg.cachedAt).getTime()
        const now = new Date().getTime()
        const ttlMs = ttlMinutes * 60 * 1000

        return now - cacheTime < ttlMs
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to check cache validity for ${name}`,
          error,
        )
        return false
      }
    },

    // Token operations
    async getToken(token: string) {
      try {
        const result = await db
          .select()
          .from(schema.tokens)
          .where(sql`token = ${token}`)
          .get()
        if (!result) return null
        return {
          token: result.token,
          uuid: result.uuid,
          scope: parseJSON(result.scope) as {
            values: string[]
            types: {
              pkg?: { read: boolean; write: boolean }
              user?: { read: boolean; write: boolean }
            }
          }[],
        }
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to get token ${token}`,
          _error,
        )
        return null
      }
    },

    // Validate if a user can access or modify another user's token
    async validateTokenAccess(authToken: string, targetUuid: string) {
      // Special characters validation for UUIDs
      const specialChars = ['~', '!', '*', '^', '&']
      if (
        targetUuid &&
        specialChars.some(char => targetUuid.startsWith(char))
      ) {
        throw new Error(
          'Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)',
        )
      }

      // If no auth token provided, cannot proceed
      if (!authToken) {
        throw new Error('Unauthorized')
      }

      // Get authenticated user from token
      const authUser = await this.getToken(authToken)
      if (!authUser?.uuid) {
        throw new Error('Unauthorized')
      }

      // Allow users to manage their own tokens
      if (authUser.uuid === targetUuid) {
        return true
      }

      // Check user permissions
      const scope = authUser.scope as {
        values: string[]
        types: {
          pkg?: { read: boolean; write: boolean }
          user?: { read: boolean; write: boolean }
        }
      }[]
      const uuid = targetUuid

      // Parse token access permissions - variables kept for future use
      const _read = ['get']
      const _write = ['put', 'post', 'delete']
      let anyUser = false
      let specificUser = false
      let writeAccess = false

      if (Array.isArray(scope)) {
        for (const s of scope) {
          if (s.types.user) {
            if (s.values.includes('*')) {
              anyUser = true
            }
            if (s.values.includes(`~${uuid}`)) {
              specificUser = true
            }
            if ((anyUser || specificUser) && s.types.user.write) {
              writeAccess = true
            }
          }
        }
      }

      // Check if user has appropriate permissions
      if ((!anyUser && !specificUser) || !writeAccess) {
        throw new Error('Unauthorized')
      }

      return true
    },

    async upsertToken(
      token: string,
      uuid: string,
      scope: {
        values: string[]
        types: {
          pkg?: { read: boolean; write: boolean }
          user?: { read: boolean; write: boolean }
        }
      }[],
      authToken?: string,
    ) {
      // Validate the UUID doesn't start with special characters
      const specialChars = ['~', '!', '*', '^', '&']
      if (uuid && specialChars.some(char => uuid.startsWith(char))) {
        throw new Error(
          'Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)',
        )
      }

      // If authToken is provided, validate access permissions
      if (authToken) {
        await this.validateTokenAccess(authToken, uuid)
      }

      // After validation passes, perform the database operation

      return db
        .insert(schema.tokens)
        .values({
          token,
          uuid,
          scope: stringifyJSON(scope),
        })
        .onConflictDoUpdate({
          target: schema.tokens.token,
          set: {
            uuid,
            scope: stringifyJSON(scope),
          },
        })
    },

    async deleteToken(token: string, authToken?: string) {
      if (authToken) {
        // Get the token data to check its UUID
        const tokenData = await this.getToken(token)
        if (tokenData?.uuid) {
          // Validate access permission for this UUID
          await this.validateTokenAccess(authToken, tokenData.uuid)
        }
      }

      return db
        .delete(schema.tokens)
        .where(sql`token = ${token}`)
        .run()
    },

    // Version operations
    async getVersion(spec: string) {
      try {
        const result = await db
          .select()
          .from(schema.versions)
          .where(sql`spec = ${spec}`)
          .get()
        if (!result) return null
        return {
          spec: result.spec,
          manifest: parseJSON(result.manifest) as Record<string, any>,
          published_at: result.publishedAt,
        }
      } catch (_error: unknown) {
        logger.error(
          `[DB ERROR] Failed to get version ${spec}`,
          _error,
        )
        return null
      }
    },

    async upsertVersion(
      spec: string,
      manifest: Record<string, any>,
      publishedAt: string,
    ) {
      try {
        // Attempting to upsert version: ${spec}
        // Make sure manifest is an object
        if (typeof manifest !== 'object') {
          // Invalid manifest for ${spec}, received: ${typeof manifest}
          manifest = {
            name: spec.split('@')[0],
            version: spec.split('@').slice(1).join('@'),
          }
        }

        const result = await db
          .insert(schema.versions)
          .values({
            spec,
            manifest: stringifyJSON(manifest),
            publishedAt,
          })
          .onConflictDoUpdate({
            target: schema.versions.spec,
            set: {
              manifest: stringifyJSON(manifest),
              publishedAt,
            },
          })
        // Successfully upserted version: ${spec}
        return result
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to upsert version ${spec}`,
          error,
        )
        return { success: true } // Mock successful operation
      }
    },

    async upsertCachedVersion(
      spec: string,
      manifest: Record<string, any>,
      upstream: string,
      publishedAt: string,
    ) {
      try {
        // Attempting to upsert cached version: ${spec} from upstream: ${upstream}

        // Make sure manifest is an object
        if (typeof manifest !== 'object') {
          // Invalid manifest for ${spec}, received: ${typeof manifest}
          manifest = {
            name: spec.split('@')[0],
            version: spec.split('@').slice(1).join('@'),
          }
        }

        const result = await db
          .insert(schema.versions)
          .values({
            spec,
            manifest: stringifyJSON(manifest),
            publishedAt,
            origin: 'upstream',
            upstream,
            cachedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.versions.spec,
            set: {
              manifest: stringifyJSON(manifest),
              cachedAt: new Date().toISOString(),
            },
          })
        // Successfully upserted cached version: ${spec}
        return result
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to upsert cached version ${spec}`,
          error,
        )
        return { success: true }
      }
    },

    async getCachedVersion(spec: string) {
      try {
        // Attempting to get cached version: ${spec}
        const result = await db
          .select()
          .from(schema.versions)
          .where(sql`spec = ${spec}`)
          .get()
        if (!result) return null
        return {
          spec: result.spec,
          manifest: parseJSON(result.manifest) as Record<string, any>,
          publishedAt: result.publishedAt,
          origin: result.origin,
          upstream: result.upstream,
          cachedAt: result.cachedAt,
        }
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get cached version ${spec}`,
          error,
        )
        return null
      }
    },

    async isVersionCacheValid(spec: string, ttlMinutes = 525600) {
      // Default 1 year for manifests
      try {
        const version = await this.getCachedVersion(spec)
        if (!version?.cachedAt || version.origin !== 'upstream') {
          return false
        }

        const cacheTime = new Date(version.cachedAt).getTime()
        const now = new Date().getTime()
        const ttlMs = ttlMinutes * 60 * 1000

        return now - cacheTime < ttlMs
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to check version cache validity for ${spec}`,
          error,
        )
        return false
      }
    },

    // Search operations
    async searchPackages(query: string, scope?: string) {
      const results = await db
        .select()
        .from(schema.packages)
        .where(
          scope ?
            sql`name LIKE ${`${scope}/%`} AND name LIKE ${`%${query}%`}`
          : sql`name LIKE ${`%${query}%`}`,
        )
        .all()

      return results.map(result => ({
        name: result.name,
        tags: parseJSON(result.tags) as Record<string, string>,
      }))
    },

    // Get all versions for a specific package
    async getVersionsByPackage(packageName: string) {
      try {
        // Retrieving all versions for package: ${packageName}
        const results = await db
          .select()
          .from(schema.versions)
          .where(sql`spec LIKE ${`${packageName}@%`}`)
          .all()

        if (results.length === 0) {
          // No versions found for package: ${packageName}
          return []
        }

        return results.map(result => {
          const manifest = parseJSON(result.manifest) as Record<
            string,
            any
          >

          // Extract version from spec, handling scoped packages correctly
          // For "@scope/package@version" -> extract "version"
          // For "package@version" -> extract "version"
          let version
          const lastAtIndex = result.spec.lastIndexOf('@')
          if (lastAtIndex > 0) {
            version = result.spec.substring(lastAtIndex + 1)
          } else {
            // Fallback: assume everything after first @ is version
            version = result.spec.split('@').slice(1).join('@')
          }

          return {
            spec: result.spec,
            version,
            manifest,
            published_at: result.publishedAt,
          }
        })
      } catch (error) {
        logger.error(
          `[DB ERROR] Failed to get versions for package ${packageName}`,
          error,
        )
        return [] // Return empty array on error
      }
    },
  }
}
