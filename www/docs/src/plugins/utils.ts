import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'
import { type AstroIntegrationLogger } from 'astro'

const rebuild = (key: string) => {
  const { VLT_DOCS_REBUILD } = process.env
  if (VLT_DOCS_REBUILD === 'true') {
    return true
  }
  if (VLT_DOCS_REBUILD === undefined) {
    return false
  }
  return VLT_DOCS_REBUILD.split(',').includes(key)
}

export const cacheEntries = <
  T extends Record<string, string> | string,
>(
  entries: T,
  rebuildKey: string,
  logger: AstroIntegrationLogger,
): T | null => {
  if (process.env.NODE_ENV === 'test') {
    logger.warn(`skipping due to NODE_ENV=test`)
    return null
  }

  const keys: string[] = []
  const values: string[] = []

  if (typeof entries === 'string') {
    values.push(entries)
  } else {
    for (const [k, v] of Object.entries(entries)) {
      keys.push(k)
      values.push(v)
    }
  }

  const resolved = values.map(v =>
    resolve(import.meta.dirname, '../../src/content/docs', v),
  )

  if (rebuild(rebuildKey)) {
    logger.info(`removing generated files`)
    for (const v of resolved) {
      rmSync(v, { force: true, recursive: true })
    }
  }

  if (resolved.map(v => existsSync(v)).every(Boolean)) {
    logger.info(
      `using previously generated files, run with VLT_DOCS_REBUILD=${rebuildKey} to rebuild`,
    )
    return null
  }

  return keys.length ?
      (Object.fromEntries(keys.map((k, i) => [k, resolved[i]])) as T)
    : (resolved[0] as T)
}
