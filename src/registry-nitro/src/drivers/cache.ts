import { useStorage } from 'nitro/storage'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'nitro/h3'
import { text, arrayBuffer } from 'stream/consumers'
import { useRuntimeConfig } from 'nitro/runtime-config'
import type * as DBTypes from '../db/index.ts'
import assert from 'node:assert'
import type { NeonQueryPromise } from '@neondatabase/serverless'

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
) {
  let row: DBTypes.Package | undefined = undefined
  let versions: DBTypes.Version[] = []

  const timeKey = `[get_packument] ${name}`
  console.time(timeKey)
  if (ctx.dialect === 'sqlite') {
    row = await ctx.db.query.packages.findFirst({
      where: eq(ctx.schema.packages.name, name),
    })
    versions = await ctx.db.query.versions.findMany({
      where: eq(ctx.schema.versions.name, name),
    })
  } else {
    row = await ctx.db.query.packages.findFirst({
      where: eq(ctx.schema.packages.name, name),
    })
    versions = await ctx.db.query.versions.findMany({
      where: eq(ctx.schema.versions.name, name),
    })
  }
  console.timeEnd(timeKey)

  if (!row) {
    return null
  }

  const data = JSON.parse(row.packument)
  data.versions = Object.fromEntries(
    versions.map(v => [v.version, JSON.parse(v.manifest)]),
  )

  return {
    data,
    headers: parseHeaders(row.headers),
    updatedAt: row.updatedAt,
  }
}

export async function setCachedPackument(
  name: string,
  data: ReadableStream | string,
  headers: Record<string, string>,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  let packument: any

  if (data instanceof ReadableStream) {
    packument = JSON.parse(await text(data))
  } else {
    packument = JSON.parse(data)
  }

  const { versions } = packument
  packument.versions = {}

  const row = {
    packument: JSON.stringify(packument),
    headers,
    updatedAt: Date.now(),
    origin,
  }

  const timeKey = `[set_packument] ${name}`
  console.time(timeKey)
  if (ctx.dialect === 'sqlite') {
    await ctx.db.transaction(async tx => {
      await tx
        .insert(ctx.schema.packages)
        .values({ name, ...row })
        .onConflictDoUpdate({
          target: ctx.schema.packages.name,
          set: row,
        })

      for (const [version, manifest] of Object.entries(versions)) {
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

      for (const [version, manifest] of Object.entries(versions)) {
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
  console.timeEnd(timeKey)
}

export async function getCachedVersion(
  name: string,
  version: string,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  let row: DBTypes.Version | undefined = undefined

  const timeKey = `[get_version] ${name} ${version}`
  console.time(timeKey)
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
  console.timeEnd(timeKey)

  if (!row) return null

  return {
    data: JSON.parse(row.manifest),
    headers: parseHeaders(row.headers),
    updatedAt: row.updatedAt,
  }
}

export async function setCachedVersion(
  name: string,
  version: string,
  data: unknown,
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

  const timeKey = `[set_version] ${name}@${version}`
  console.time(timeKey)
  if (ctx.dialect === 'sqlite') {
    await ctx.db
      .insert(ctx.schema.versions)
      .values({ name, version, ...set })
      .onConflictDoUpdate({
        target: [
          ctx.schema.versions.name,
          ctx.schema.versions.version,
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
        ],
        set,
      })
  }
  console.timeEnd(timeKey)
}

export async function getCachedTarball(
  name: string,
  version: string,
  ctx: DBTypes.Context,
  { origin }: { origin: string },
) {
  let row: DBTypes.Tarball | undefined = undefined

  const timeKey = `[get_tarball_db] ${name}@${version}`
  if (ctx.dialect === 'sqlite') {
    row = await ctx.db.query.tarballs.findFirst({
      where: and(
        eq(ctx.schema.tarballs.name, name),
        eq(ctx.schema.tarballs.version, version),
        eq(ctx.schema.tarballs.origin, origin),
      ),
    })
  } else {
    row = await ctx.db.query.tarballs.findFirst({
      where: and(
        eq(ctx.schema.tarballs.name, name),
        eq(ctx.schema.tarballs.version, version),
        eq(ctx.schema.tarballs.origin, origin),
      ),
    })
  }
  console.timeEnd(timeKey)

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

  const timeKey1 = `[get_tarball_storage] ${name}@${version}`
  console.time(timeKey1)
  const body = await useStorage('tarballs').getItemRaw(key)
  console.timeEnd(timeKey1)

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
  const key = ['tarballs', origin, name, version]
    .filter(Boolean)
    .join('/')

  const timeKey = `[set_tarball] ${name}@${version}`
  console.time(timeKey)
  const body: ReadableStream | ArrayBuffer =
    // Buffer to avoid Transfer-Encoding: chunked which S3 rejects
    config.storage === 's3' ? await arrayBuffer(data) : data
  await useStorage('tarballs').setItemRaw(key, body)
  console.timeEnd(timeKey)

  const set = {
    headers,
    updatedAt: Date.now(),
    origin,
  }

  const timeKey2 = `[set_tarball_db] ${name}@${version}`
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
  console.timeEnd(timeKey2)
}

export async function fetchAndCache<T>(
  event: H3Event,
  fetcher: () => Promise<{
    data: T
    headers: Record<string, string>
  }>,
  cacheGetter: () => Promise<{
    data: T
    headers: Record<string, string>
    updatedAt: number
  } | null>,
  cacheSetter: (
    data: T,
    headers: Record<string, string>,
  ) => Promise<void>,
  ttl: number,
) {
  const params = Object.entries(event.context.params ?? {})
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')

  const timeKey = `[cache_read] ${params}`
  const cached = await cacheGetter()
  console.timeEnd(timeKey)

  if (cached) {
    console.log('[cache_hit]', params)
    const { data, headers, updatedAt } = cached
    if (Date.now() - updatedAt > ttl) {
      event.waitUntil(
        (async () => {
          const timeKey2 = `[cache_fetch_swr] ${params}`
          console.time(timeKey2)
          try {
            const { data, headers } = await fetcher()
            await cacheSetter(data, headers)
          } catch (err: unknown) {
            console.error('[cache_fetch_swr] failed', err)
          }
          console.timeEnd(timeKey2)
        })(),
      )
    }
    return { data, headers }
  }

  console.log('[cache_miss]', params)

  const timeKey2 = `[cache_fetch] ${params}`
  const { data, headers } = await fetcher()
  console.timeEnd(timeKey2)

  assert(
    data instanceof ReadableStream,
    'data must be a ReadableStream',
  )

  const [streamForResponse, streamForCache] = data.tee()

  event.waitUntil(
    (async () => {
      const timeKey2 = `[cache_set] ${params}`
      console.time(timeKey2)
      try {
        await cacheSetter(streamForCache as T, headers)
      } catch (err: unknown) {
        console.error('[cache_set] failed', err)
      }
      console.timeEnd(timeKey2)
    })(),
  )

  return { data: streamForResponse, headers }
}
