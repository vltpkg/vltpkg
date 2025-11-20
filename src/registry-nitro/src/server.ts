import {
  H3,
  defineEventHandler,
  createError,
  proxyRequest,
  getQuery,
  defineMiddleware,
} from 'nitro/h3'
import type { H3Event } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import * as schemaPg from './db/schema-pg.ts'
import * as schemaSqlite from './db/schema-sqlite.ts'
import {
  fetchAndCache,
  filterHeaders,
  getCachedPackument,
  getCachedTarball,
  getCachedVersion,
  setCachedPackument,
  setCachedTarball,
  setCachedVersion,
  TTL,
} from './drivers/cache.ts'

import neon from './db/neon.ts'
import sqlite from './db/sqlite.ts'

const dbMiddleware = defineMiddleware(event => {
  const config = useRuntimeConfig()

  if (config.db === 'neon') {
    event.context.db = neon(config.NEON_DATABASE_URL)
  } else if (config.db === 'sqlite') {
    event.context.db = sqlite(config.SQLITE_DATABASE_FILE_NAME)
  } else {
    throw new Error(`Invalid database type: ${config.db}`)
  }
})

const getDbSchema = () => {
  const config = useRuntimeConfig()
  return config.db === 'neon' ? schemaPg : schemaSqlite
}

const fetchUpstreamJSON = async (path: string) => {
  const res = await fetch(`https://registry.npmjs.org${path}`)
  if (!res.ok) {
    if (res.status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
      })
    }
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText,
    })
  }
  const headers = filterHeaders(res.headers)
  const data = await res.json()
  return { data, headers }
}

const fetchUpstreamTarball = async (path: string) => {
  const res = await fetch(`https://registry.npmjs.org${path}`)
  if (!res.ok) {
    if (res.status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
      })
    }
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText,
    })
  }
  const headers = filterHeaders(res.headers)
  // Return the stream directly!
  return { data: res.body, headers }
}

const proxyToNpm = (event: H3Event, url: string) => {
  return proxyRequest(event, `https://registry.npmjs.org${url}`, {
    onResponse: (event, response) => {
      // @ts-expect-error - Linter suggests using this but types might be outdated
      event.res.statusCode = response.status
      // @ts-expect-error - Linter suggests using this but types might be outdated
      event.res.statusMessage = response.statusText
    },
  })
}

const npm = new H3()

// Search
const searchHandler = defineEventHandler(async event => {
  const params = new URLSearchParams()
  const query = getQuery(event)

  const defaults = {
    quality: '0.65',
    popularity: '0.98',
    maintenance: '0.5',
    ...query,
  }

  for (const [key, value] of Object.entries(defaults)) {
    if (value) {
      params.set(key, value)
    }
  }

  return proxyToNpm(event, `/-/v1/search?${params.toString()}`)
})

npm.get('/-/v1/search', searchHandler)

// Packument: /:name or /@:scope/:name
const packumentHandler = defineEventHandler(async event => {
  const { name, scope } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const db = event.context.db
  const schema = getDbSchema()

  const result = await fetchAndCache(
    event,
    () => fetchUpstreamJSON(`/${pkgName}`),
    () => getCachedPackument(pkgName, db, schema),
    (data, headers) =>
      setCachedPackument(pkgName, data, headers, db, schema),
    TTL.PACKUMENT,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }
  return result.data
})

npm.get('/:name', packumentHandler)
npm.get('/@:scope/:name', packumentHandler)

// Version: /:name/:version or /@:scope/:name/:version
const versionHandler = defineEventHandler(async event => {
  const { name, scope, version } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const db = event.context.db
  const schema = getDbSchema()

  const result = await fetchAndCache(
    event,
    () => fetchUpstreamJSON(`/${pkgName}/${version}`),
    () => getCachedVersion(pkgName, version!, db, schema),
    (data, headers) =>
      setCachedVersion(pkgName, version!, data, headers, db, schema),
    TTL.VERSION,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }
  return result.data
})

npm.get('/:name/:version', versionHandler)
npm.get('/@:scope/:name/:version', versionHandler)

// Tarball: /:name/-/:tarball or /@:scope/:name/-/:tarball
const tarballHandler = defineEventHandler(async event => {
  const { name, scope, tarball } = event.context.params ?? {}
  const pkgName = scope ? `@${scope}/${name}` : name!
  const db = event.context.db
  const schema = getDbSchema()

  // Upstream URL: /scope/name/-/tarball.tgz (scoped) or /name/-/tarball.tgz (unscoped)
  const upstreamPath = `/${pkgName}/-/${tarball}`

  const result = await fetchAndCache(
    event,
    () => fetchUpstreamTarball(upstreamPath),
    () => getCachedTarball(pkgName, tarball!, db, schema),
    (data, headers) =>
      setCachedTarball(pkgName, tarball!, data, headers, db, schema),
    TTL.TARBALL,
  )

  for (const [k, v] of Object.entries(result.headers)) {
    event.res.headers.set(k, v)
  }
  return result.data
})

npm.get('/:name/-/:tarball', tarballHandler)
npm.get('/@:scope/:name/-/:tarball', tarballHandler)

const app = new H3()
app.use(dbMiddleware)
app.get('/', () => ({ ok: true }))
app.mount('/npm', npm)

export default {
  async fetch(request: Request) {
    const url = new URL(request.url)

    // The npm CLI will sometimes use an encoded forward slash (%2F) so we
    // decode only that character into a new request so that our scoped handlers work
    // as expected.
    if (
      (url.pathname.startsWith('/npm/') ||
        url.pathname.startsWith('/local/')) &&
      (url.pathname.includes('%2F') || url.pathname.includes('%2f'))
    ) {
      url.pathname = url.pathname
        .replaceAll('%2F', '/')
        .replaceAll('%2f', '/')
      request = new Request(url.toString(), request)
    }

    return app.fetch(request)
  },
}
