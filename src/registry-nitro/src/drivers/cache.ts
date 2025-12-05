import { useStorage } from 'nitro/storage'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'nitro/h3'
import { text, arrayBuffer } from 'stream/consumers'
import { useRuntimeConfig } from 'nitro/runtime-config'
import type * as DBTypes from '../db/index.ts'
import assert from 'node:assert'
import type { NeonQueryPromise } from '@neondatabase/serverless'
import {
  withDbRead,
  withDbWrite,
  withStorageRead,
  withStorageWrite,
  withFetch,
  logger,
  logCacheHit,
  logCacheMiss,
  captureException,
} from '../telemetry.ts'

const ALLOWED_HEADERS = [
  'content-type',
  'content-length',
  'etag',
  'last-modified',
]

export const filterHeaders = (headers: Headers) => {
  const out: Record<string, string> = {}
  for (const key of ALLOWED_HEADERS) {
    const val = headers.get(key)
    if (val) out[key] = val
  }
  return out
}

function parseHeaders(headers: unknown): Record<string, string> {
  if (typeof headers === 'string') {
    return JSON.parse(headers) as Record<string, string>
  }
  return headers as Record<string, string>
}

export async function getCachedPackument(
  name: string,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  return withDbRead(
    'get_packument',
    {
      packageName: name,
      origin,
      resourceType: 'packument',
      dialect: ctx.dialect,
    },
    async () => {
      const packageWhere = and(
        eq(ctx.schema.packages.name, name),
        eq(ctx.schema.packages.origin, origin),
      )

      const versionWhere = and(
        eq(ctx.schema.versions.name, name),
        eq(ctx.schema.versions.origin, origin),
      )

      let row: DBTypes.Package | undefined = undefined
      let versions: DBTypes.Version[] = []

      if (ctx.dialect === 'sqlite') {
        const packageRow = await ctx.db.query.packages.findFirst({
          where: packageWhere,
          with: {
            versions: {
              where: versionWhere,
            },
          },
        })
        row = packageRow
        versions = packageRow?.versions ?? []
      } else {
        const packageRow = await ctx.db.query.packages.findFirst({
          where: packageWhere,
          with: {
            versions: {
              where: versionWhere,
            },
          },
        })
        row = packageRow
        versions = packageRow?.versions ?? []
      }

      if (!row) {
        return null
      }

      const data = JSON.parse(row.packument)
      data.versions = Object.fromEntries(
        versions.map((v: DBTypes.Version) => [
          v.version,
          JSON.parse(v.manifest),
        ]),
      )

      return {
        data,
        headers: parseHeaders(row.headers),
        updatedAt: row.updatedAt,
      }
    },
  )
}

export async function setCachedPackument(
  name: string,
  data: ReadableStream | string,
  headers: Record<string, string>,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  let packument: Record<string, unknown>

  if (data instanceof ReadableStream) {
    packument = JSON.parse(await text(data))
  } else {
    packument = JSON.parse(data)
  }

  const { versions } = packument as {
    versions: Record<string, unknown>
  }
  packument.versions = {}

  const row = {
    packument: JSON.stringify(packument),
    headers,
    updatedAt: Date.now(),
    origin,
  }

  await withDbWrite(
    'set_packument',
    {
      packageName: name,
      origin,
      resourceType: 'packument',
      dialect: ctx.dialect,
    },
    async () => {
      if (ctx.dialect === 'sqlite') {
        await ctx.db.transaction(async tx => {
          await tx
            .insert(ctx.schema.packages)
            .values({ name, ...row })
            .onConflictDoUpdate({
              target: [
                ctx.schema.packages.name,
                ctx.schema.packages.origin,
              ],
              set: row,
            })

          for (const [version, manifest] of Object.entries(
            versions,
          )) {
            const versionRow = {
              manifest: JSON.stringify(manifest),
              headers,
              updatedAt: row.updatedAt,
              origin,
            }
            await tx
              .insert(ctx.schema.versions)
              .values({ name, version, ...versionRow })
              .onConflictDoUpdate({
                target: [
                  ctx.schema.versions.name,
                  ctx.schema.versions.version,
                  ctx.schema.versions.origin,
                ],
                set: versionRow,
              })
          }
        })
      } else {
        await ctx.$client.transaction(tx => {
          const queries: NeonQueryPromise<false, false>[] = [
            tx`
              INSERT INTO packages (name, packument, headers, updated_at, origin)
              VALUES (${name}, ${row.packument}, ${JSON.stringify(headers)}, ${row.updatedAt}, ${origin})
              ON CONFLICT (name, origin) DO UPDATE SET
              packument = EXCLUDED.packument,
              headers = EXCLUDED.headers,
              updated_at = EXCLUDED.updated_at
            `,
          ]

          const values: string[] = []
          const params: unknown[] = []

          for (const [version, manifest] of Object.entries(
            versions,
          )) {
            const next = [
              name,
              version,
              JSON.stringify(manifest),
              JSON.stringify(headers),
              row.updatedAt,
              origin,
            ]
            values.push(
              `(${next.map((_, i) => `$${params.length + i + 1}`).join(', ')})`,
            )
            params.push(...next)
          }

          const versionQuery = `
            INSERT INTO versions (name, version, manifest, headers, updated_at, origin)
            VALUES ${values.join(', ')}
            ON CONFLICT (name, version, origin) DO UPDATE SET
            manifest = EXCLUDED.manifest,
            headers = EXCLUDED.headers,
            updated_at = EXCLUDED.updated_at
          `
          queries.push(tx.query(versionQuery, params))

          return queries
        })
      }
    },
  )
}

export async function getCachedVersion(
  name: string,
  version: string,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  return withDbRead(
    'get_version',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'version',
      dialect: ctx.dialect,
    },
    async () => {
      let row: DBTypes.Version | undefined = undefined

      if (ctx.dialect === 'sqlite') {
        row = await ctx.db.query.versions.findFirst({
          where: and(
            eq(ctx.schema.versions.name, name),
            eq(ctx.schema.versions.version, version),
            eq(ctx.schema.versions.origin, origin),
          ),
        })
      } else {
        row = await ctx.db.query.versions.findFirst({
          where: and(
            eq(ctx.schema.versions.name, name),
            eq(ctx.schema.versions.version, version),
            eq(ctx.schema.versions.origin, origin),
          ),
        })
      }

      if (!row) return null

      return {
        data: JSON.parse(row.manifest),
        headers: parseHeaders(row.headers),
        updatedAt: row.updatedAt,
      }
    },
  )
}

export async function setCachedVersion(
  name: string,
  version: string,
  data: ReadableStream | Record<string, unknown>,
  headers: Record<string, string>,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  let manifest: string

  if (data instanceof ReadableStream) {
    manifest = await text(data)
  } else {
    manifest = JSON.stringify(data)
  }

  const set = {
    manifest,
    headers,
    updatedAt: Date.now(),
    origin,
  }

  await withDbWrite(
    'set_version',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'version',
      dialect: ctx.dialect,
    },
    async () => {
      if (ctx.dialect === 'sqlite') {
        await ctx.db
          .insert(ctx.schema.versions)
          .values({ name, version, ...set })
          .onConflictDoUpdate({
            target: [
              ctx.schema.versions.name,
              ctx.schema.versions.version,
              ctx.schema.versions.origin,
            ],
            set,
          })
      } else {
        await ctx.db
          .insert(ctx.schema.versions)
          .values({ name, version, ...set })
          .onConflictDoUpdate({
            target: [
              ctx.schema.versions.name,
              ctx.schema.versions.version,
              ctx.schema.versions.origin,
            ],
            set,
          })
      }
    },
  )
}

export async function getCachedTarball(
  name: string,
  version: string,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  const config = useRuntimeConfig()
  const storageType = config.storage as 'fs' | 'r2' | 's3'

  const row = await withDbRead(
    'get_tarball_db',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'tarball',
      dialect: ctx.dialect,
    },
    async () => {
      if (ctx.dialect === 'sqlite') {
        return ctx.db.query.tarballs.findFirst({
          where: and(
            eq(ctx.schema.tarballs.name, name),
            eq(ctx.schema.tarballs.version, version),
            eq(ctx.schema.tarballs.origin, origin),
          ),
        })
      } else {
        return ctx.db.query.tarballs.findFirst({
          where: and(
            eq(ctx.schema.tarballs.name, name),
            eq(ctx.schema.tarballs.version, version),
            eq(ctx.schema.tarballs.origin, origin),
          ),
        })
      }
    },
  )

  if (!row) {
    return null
  }

  const key = ['tarballs', origin, name, version]
    .filter(Boolean)
    .join('/')

  const hasItem = await useStorage('tarballs').hasItem(key)
  if (!hasItem) {
    return null
  }

  const body = await withStorageRead(
    'get_tarball_storage',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'tarball',
      storageType,
    },
    () => useStorage('tarballs').getItemRaw(key),
  )

  return {
    data: body,
    headers: parseHeaders(row.headers),
    updatedAt: row.updatedAt,
  }
}

export async function setCachedTarball(
  name: string,
  version: string,
  data: ReadableStream,
  headers: Record<string, string>,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  const config = useRuntimeConfig()
  const storageType = config.storage as 'fs' | 'r2' | 's3'
  const key = ['tarballs', origin, name, version]
    .filter(Boolean)
    .join('/')

  await withStorageWrite(
    'set_tarball_storage',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'tarball',
      storageType,
    },
    async () => {
      const body: ReadableStream | ArrayBuffer =
        // Buffer to avoid Transfer-Encoding: chunked which S3 rejects
        config.storage === 's3' ? await arrayBuffer(data) : data
      await useStorage('tarballs').setItemRaw(key, body)
    },
  )

  const set = {
    headers,
    updatedAt: Date.now(),
    origin,
  }

  await withDbWrite(
    'set_tarball_db',
    {
      packageName: name,
      version,
      origin,
      resourceType: 'tarball',
      dialect: ctx.dialect,
    },
    async () => {
      if (ctx.dialect === 'sqlite') {
        await ctx.db
          .insert(ctx.schema.tarballs)
          .values({ name, version, ...set })
          .onConflictDoUpdate({
            target: [
              ctx.schema.tarballs.name,
              ctx.schema.tarballs.version,
              ctx.schema.tarballs.origin,
            ],
            set,
          })
      } else {
        await ctx.db
          .insert(ctx.schema.tarballs)
          .values({ name, version, ...set })
          .onConflictDoUpdate({
            target: [
              ctx.schema.tarballs.name,
              ctx.schema.tarballs.version,
              ctx.schema.tarballs.origin,
            ],
            set,
          })
      }
    },
  )
}

export async function fetchAndCache(
  event: H3Event,
  fetcher: () => Promise<{
    data: ReadableStream
    headers: Record<string, string>
  }>,
  cacheGetter: () => Promise<{
    data: Record<string, unknown>
    headers: Record<string, string>
    updatedAt: number
  } | null>,
  cacheSetter: (
    data: ReadableStream,
    headers: Record<string, string>,
  ) => Promise<void>,
  ttl: number,
  meta: {
    packageName: string
    version?: string
    origin: string
    resourceType: 'packument' | 'version' | 'tarball'
  },
) {
  const cached = await cacheGetter()

  if (cached) {
    const { data, headers, updatedAt } = cached
    const stale = Date.now() - updatedAt > ttl

    logCacheHit(meta.resourceType, meta.packageName, {
      stale,
      version: meta.version,
      origin: meta.origin,
    })

    if (stale) {
      event.waitUntil(
        (async () => {
          try {
            const result = await withFetch(
              `upstream:${meta.packageName}${meta.version ? `@${meta.version}` : ''}`,
              fetcher,
            )
            await cacheSetter(result.data, result.headers)
          } catch (err: unknown) {
            logger.error('cache_fetch_swr_failed', {
              'package.name': meta.packageName,
              'package.version': meta.version,
              error: err instanceof Error ? err.message : String(err),
            })
            captureException(err, {
              operation: 'cache_fetch_swr',
              ...meta,
            })
          }
        })(),
      )
    }
    return { data, headers }
  }

  logCacheMiss(meta.resourceType, meta.packageName, {
    version: meta.version,
    origin: meta.origin,
  })

  const { data, headers } = await withFetch(
    `upstream:${meta.packageName}${meta.version ? `@${meta.version}` : ''}`,
    fetcher,
  )

  assert(
    data instanceof ReadableStream,
    'data must be a ReadableStream',
  )

  const [streamForResponse, streamForCache] = data.tee()

  event.waitUntil(
    (async () => {
      try {
        await cacheSetter(streamForCache, headers)
      } catch (err: unknown) {
        logger.error('cache_set_failed', {
          'package.name': meta.packageName,
          'package.version': meta.version,
          error: err instanceof Error ? err.message : String(err),
        })
        captureException(err, {
          operation: 'cache_set',
          ...meta,
        })
      }
    })(),
  )

  return { data: streamForResponse, headers }
}
