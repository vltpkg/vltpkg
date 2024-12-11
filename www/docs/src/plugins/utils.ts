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

export const skipDir = (
  entries: string[],
  {
    logger,
    rebuildKey,
  }: {
    rebuildKey: string
    logger: AstroIntegrationLogger
  },
) => {
  if (process.env.NODE_ENV === 'test') {
    logger.warn(`skipping due to NODE_ENV=test`)
    return null
  }

  const resolvedEntries = entries.map(e =>
    resolve(import.meta.dirname, '../../src/content/docs', e),
  )

  if (rebuild(rebuildKey)) {
    logger.info(`removing generated files`)
    for (const d of resolvedEntries) {
      rmSync(d, { force: true, recursive: true })
    }
  }

  if (resolvedEntries.map(d => existsSync(d)).every(Boolean)) {
    logger.info(
      `using previously generated files, run with VLT_DOCS_REBUILD=${rebuildKey} to rebuild`,
    )
    return null
  }

  return resolvedEntries
}
