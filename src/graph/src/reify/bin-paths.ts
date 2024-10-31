import { type Manifest } from '@vltpkg/types'

const parseScope = (scoped: string): [string | undefined, string] => {
  if (scoped.startsWith('@')) {
    const [scope, name, ...rest] = scoped.split('/')
    if (scope && name && rest.length === 0) return [scope, name]
  }
  return [undefined, scoped]
}

/** get the bin scripts for a package */
export const binPaths = (
  manifest: Manifest,
): Record<string, string> => {
  const { name, bin } = manifest

  if (bin) {
    if (name && typeof bin === 'string') {
      const [_scope, pkg] = parseScope(name)
      return { [pkg]: bin }
    } else if (typeof bin === 'object') {
      return bin
    }
  }
  return {}
}
