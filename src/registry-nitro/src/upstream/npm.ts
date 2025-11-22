import { defineEventHandler, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { ms } from 'ms'
import type { Context as DbContext } from '../db/index.ts'
import {
  fetchAndCache,
  filterHeaders,
  getCachedPackument,
  getCachedTarball,
  getCachedVersion,
  setCachedPackument,
  setCachedTarball,
  setCachedVersion,
} from '../drivers/cache.ts'

const { VSR_PACKUMENT_TTL, VSR_MANIFEST_TTL, VSR_TARBALL_TTL } =
  useRuntimeConfig()
const TTL = {
  PACKUMENT: ms(VSR_PACKUMENT_TTL ?? '5m'),
  MANIFEST: ms(VSR_MANIFEST_TTL ?? '24h'),
  TARBALL: ms(VSR_TARBALL_TTL ?? '1yr'),
}

const fetchUpstream = async (path: string) => {
  const res = await fetch(`https://registry.npmjs.org${path}`)
  if (!res.ok) {
    throw new HTTPError(res.statusText, { status: res.status })
  }
  const headers = filterHeaders(res.headers)
  return { data: res.body, headers }
}

export const packumentHandler = defineEventHandler(async event => {
  const { name, scope } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const db = event.context.db as DbContext

  const result = await fetchAndCache(
    event,
    () => fetchUpstream(`/${pkgName}`),
    () => getCachedPackument(pkgName, db),
    (data, headers) =>
      setCachedPackument(pkgName, data, headers, db, {
        origin: 'npm',
      }),
    TTL.PACKUMENT,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }

  return result.data
})

export const versionHandler = defineEventHandler(async event => {
  const { name, scope, version } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const db = event.context.db as DbContext

  const result = await fetchAndCache(
    event,
    () => fetchUpstream(`/${pkgName}/${version}`),
    () => getCachedVersion(pkgName, version!, db, { origin: 'npm' }),
    (data, headers) =>
      setCachedVersion(pkgName, version!, data, headers, db, {
        origin: 'npm',
      }),
    TTL.MANIFEST,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }

  return result.data
})

export const tarballHandler = defineEventHandler(async event => {
  const { name, scope, tarball } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const version = tarball!.replace(name! + '-', '')
  const db = event.context.db as DbContext

  const result = await fetchAndCache(
    event,
    () => fetchUpstream(`/${pkgName}/-/${tarball}`),
    () => getCachedTarball(pkgName, version, db, { origin: 'npm' }),
    (data, headers) =>
      setCachedTarball(pkgName, version, data, headers, db, {
        origin: 'npm',
      }),
    TTL.TARBALL,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }

  return result.data
})
