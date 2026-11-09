import type { NormalizedManifest } from '@vltpkg/types'
import { join } from 'node:path'
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
