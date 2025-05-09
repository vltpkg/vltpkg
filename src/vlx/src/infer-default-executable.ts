import type { Manifest } from '@vltpkg/types'

/**
 * Infer the default binary from a package.
 *
 * Returns `undefined` if it couldn't be determined
 */
export const inferDefaultExecutable = ({
  name,
  bin,
}: Manifest): undefined | [string, string] => {
  if (!bin) return undefined

  let binName = name?.startsWith('@') ? name.split('/')[1] : name
  if (!binName) return undefined

  if (typeof bin === 'string') {
    return [binName, bin]
  }

  // if it's exactly one key, that's the one,
  // even if it doesn't match the name
  const keys = Object.keys(bin)
  if (keys.length === 1) {
    binName = (keys as [string])[0]
  }

  bin = bin[binName]
  if (!bin) return undefined

  return [binName, bin]
}
