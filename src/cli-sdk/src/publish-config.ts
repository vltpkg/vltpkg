import type { NormalizedManifest } from '@vltpkg/types'

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
