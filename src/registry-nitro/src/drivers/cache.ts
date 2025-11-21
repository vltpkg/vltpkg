import { useStorage } from 'nitro/storage'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'nitro/h3'
import { text, arrayBuffer } from 'stream/consumers'
import { useRuntimeConfig } from 'nitro/runtime-config'

export const TTL = {
  PACKUMENT: 60 * 5, // 5 minutes
  VERSION: 60 * 60 * 24, // 24 hours
  TARBALL: 60 * 60 * 24 * 365, // 1 year
}

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

export const isStale = (updatedAt: number, ttl: number) => {
  return Date.now() - updatedAt > ttl * 1000
}

function parseHeaders(headers: any): Record<string, string> {
  return typeof headers === 'string' ? JSON.parse(headers) : headers
}

// Helper to buffer a stream into JSON
async function bufferStreamToJson(stream: unknown) {
  const txt = await text(stream as any)
  return JSON.parse(txt)
}

export async function getCachedPackument(
  name: string,
  db: any,
  schema: any,
) {
  const [row] = await db
    .select()
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1)

  if (!row) return null

  return {
    data: JSON.parse(row.packument),
    headers: parseHeaders(row.headers),
    updatedAt: Number(row.updatedAt),
  }
}

export async function setCachedPackument(
  name: string,
  data: any,
  headers: Record<string, string>,
  db: any,
  schema: any,
) {
  let packument: string

  if (
    data instanceof ReadableStream ||
    (data && typeof data.pipe === 'function')
  ) {
    const json = await bufferStreamToJson(data)
    packument = JSON.stringify(json)
  } else {
    packument = JSON.stringify(data)
  }

  await db
    .insert(schema.packages)
    .values({
      name,
      packument,
      headers,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: schema.packages.name,
      set: { packument, headers, updatedAt: Date.now() },
    })
}

export async function getCachedVersion(
  name: string,
  version: string,
  db: any,
  schema: any,
) {
  const spec = `${name}@${version}`
  const [row] = await db
    .select()
    .from(schema.versions)
    .where(eq(schema.versions.spec, spec))
    .limit(1)

  if (!row) return null

  return {
    data: JSON.parse(row.manifest),
    headers: parseHeaders(row.headers),
    updatedAt: Number(row.updatedAt),
  }
}

export async function setCachedVersion(
  name: string,
  version: string,
  data: any,
  headers: Record<string, string>,
  db: any,
  schema: any,
) {
  const spec = `${name}@${version}`
  let manifest: string

  if (
    data instanceof ReadableStream ||
    (data && typeof data.pipe === 'function')
  ) {
    const json = await bufferStreamToJson(data)
    manifest = JSON.stringify(json)
  } else {
    manifest = JSON.stringify(data)
  }

  await db
    .insert(schema.versions)
    .values({
      spec,
      manifest,
      headers,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: schema.versions.spec,
      set: { manifest, headers, updatedAt: Date.now() },
    })
}

export async function getCachedTarball(
  name: string,
  version: string,
  db: any,
  schema: any,
) {
  const [row] = await db
    .select()
    .from(schema.tarballs)
    .where(
      and(
        eq(schema.tarballs.name, name),
        eq(schema.tarballs.version, version),
      ),
    )
    .limit(1)

  if (!row) return null

  const key = `tarballs:${name}:${version}`
  const hasItem = await useStorage().hasItem(key)
  if (!hasItem) return null

  const body = await useStorage().getItemRaw(key)

  return {
    data: body,
    headers: parseHeaders(row.headers),
    updatedAt: Number(row.updatedAt),
  }
}

export async function setCachedTarball(
  name: string,
  version: string,
  data: any,
  headers: Record<string, string>,
  db: any,
  schema: any,
) {
  const config = useRuntimeConfig()
  const key = `tarballs:${name}:${version}`

  // Buffer to avoid Transfer-Encoding: chunked which S3 rejects
  const body: ReadableStream | ArrayBuffer =
    config.tarballStorage === 's3' ? await arrayBuffer(data) : data
  await useStorage().setItemRaw(key, body)

  await db
    .insert(schema.tarballs)
    .values({
      name,
      version,
      headers,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [schema.tarballs.name, schema.tarballs.version],
      set: { headers, updatedAt: Date.now() },
    })
}

type FetchResult<T> = {
  data: T
  headers: Record<string, string>
}

export async function fetchAndCache<T>(
  event: H3Event,
  fetcher: () => Promise<FetchResult<T>>,
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
  const cached = await cacheGetter()

  if (cached) {
    const { data, headers, updatedAt } = cached
    if (isStale(updatedAt, ttl)) {
      // SWR
      event.waitUntil(
        fetcher()
          .then(({ data, headers }) => cacheSetter(data, headers))
          .catch((err: unknown) =>
            console.error('Background fetch failed', err),
          ),
      )
    }
    return { data, headers }
  }

  // Miss
  const { data, headers } = await fetcher()

  // Check for ReadableStream to tee
  if (data instanceof ReadableStream) {
    const [streamForResponse, streamForCache] = data.tee()

    event.waitUntil(
      cacheSetter(streamForCache as any, headers).catch(
        (err: unknown) => console.error('Cache set failed', err),
      ),
    )

    return { data: streamForResponse as any, headers }
  }

  throw new Error('Unsupported data type')
}
