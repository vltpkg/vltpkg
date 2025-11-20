import { useStorage } from 'nitro/storage'
import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'nitro/h3'

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
  const packument = JSON.stringify(data)

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
  const manifest = JSON.stringify(data)

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
  filename: string,
  db: any,
  schema: any,
) {
  const [row] = await db
    .select()
    .from(schema.tarballs)
    .where(
      and(
        eq(schema.tarballs.name, name),
        eq(schema.tarballs.filename, filename),
      ),
    )
    .limit(1)

  if (!row) return null

  const key = `tarballs:${filename}`
  const hasItem = await useStorage().hasItem(key)
  if (!hasItem) return null

  // Streaming support: getStream if available, else getItemRaw
  // Nitro's storage layer doesn't strictly guarantee a stream from getItemRaw unless the driver supports it
  // but for file/R2/etc it should work.
  const body = await useStorage().getItemRaw(key)

  return {
    data: body,
    headers: parseHeaders(row.headers),
    updatedAt: Number(row.updatedAt),
  }
}

export async function setCachedTarball(
  name: string,
  filename: string,
  data: any,
  headers: Record<string, string>,
  db: any,
  schema: any,
) {
  const key = `tarballs:${filename}`
  // useStorage().setItemRaw supports ReadableStream
  await useStorage().setItemRaw(key, data)

  await db
    .insert(schema.tarballs)
    .values({
      name,
      filename,
      headers,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [schema.tarballs.name, schema.tarballs.filename],
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
  if (!event.waitUntil) {
    throw new Error('event.waitUntil is required for caching')
  }

  const cached = await cacheGetter()

  if (cached) {
    const { data, headers, updatedAt } = cached
    if (isStale(updatedAt, ttl)) {
      // SWR
      event.waitUntil(
        fetcher()
          .then(
            async ({ data: freshData, headers: freshHeaders }) => {
              // If streaming, we might need to tee it again?
              // Usually SWR fetcher for tarball would need to read the stream to buffer to verify integrity
              // OR just overwrite.
              // But for tarballs we generally don't expire them (TTL 1 year).
              // So SWR is mostly for metadata (JSON).
              // If it is a stream, we must handle it carefully.
              await cacheSetter(freshData, freshHeaders)
            },
          )
          .catch(err =>
            console.error('Background fetch failed', err),
          ),
      )
    }
    return { data, headers }
  }

  // Miss
  const { data, headers } = await fetcher()

  // For streaming responses (tarballs), we need to TEE the stream
  if (data instanceof ReadableStream) {
    const [streamForResponse, streamForCache] = data.tee()

    event.waitUntil(
      cacheSetter(streamForCache as any, headers).catch(err =>
        console.error('Cache set failed', err),
      ),
    )

    return { data: streamForResponse as any, headers }
  }

  // For JSON/Buffer
  event.waitUntil(
    cacheSetter(data, headers).catch(err =>
      console.error('Cache set failed', err),
    ),
  )

  return { data, headers }
}
