import type { Manifest } from '@vltpkg/types'

const parseScope = (scoped: string): [string | undefined, string] => {
  if (scoped.startsWith('@')) {
    const [scope, name, ...rest] = scoped.split('/')
    if (scope && name && rest.length === 0) return [scope, name]
  }
  return [undefined, scoped]
}

/** normalize the bin scripts into an object */
export const normalizeBin = (
  manifest: Manifest,
): Manifest & { bin?: Record<string, string> } => {
  const { name, bin } = manifest

  if (bin && name && typeof bin === 'string') {
    const [_scope, pkg] = parseScope(name)
    manifest.bin = { [pkg]: bin }
  } else if (!bin || typeof bin !== 'object') {
    delete manifest.bin
  }

  return manifest as Manifest & { bin?: Record<string, string> }
}
