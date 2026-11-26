import type { NormalizedManifest } from '@vltpkg/types'
import { dirname, join } from 'node:path'
import type { LoadedConfig } from './config/index.ts'

type PublishConfig = {
  directory?: string
  registry?: string
  access?: string
  tag?: string
}

export const getPublishConfig = (
  manifest: NormalizedManifest,
): PublishConfig | undefined => {
  const pc: unknown = (manifest as Record<string, unknown>)
    .publishConfig
  if (pc && typeof pc === 'object') {
    return pc
  }
  return undefined
}

export const getPublishDirectory = (
  manifest: NormalizedManifest,
  dir: string,
  conf: LoadedConfig,
): string | undefined => {
  const cliPublishDir = conf.get('publish-directory')
  const publishDirectory =
    cliPublishDir ?? getPublishConfig(manifest)?.directory
  if (!publishDirectory) return undefined
  return cliPublishDir ? publishDirectory : (
      join(dir, publishDirectory)
    )
}

/**
 * `publishConfig.registry` of the package in the current directory,
 * if that package is `name` (any package when no `name` is given).
 */
export const localPublishRegistry = (
  conf: LoadedConfig,
  name?: string,
): string | undefined => {
  const path = conf.options.packageJson.find(process.cwd())
  if (!path) return undefined
  const manifest = conf.options.packageJson.read(dirname(path))
  return name === undefined || manifest.name === name ?
      getPublishConfig(manifest)?.registry
    : undefined
}
