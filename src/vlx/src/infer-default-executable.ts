import { parseScope } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'

/**
 * Infer the default binary from a package.
 *
 * Returns `undefined` if it couldn't be determined
 */
export const inferDefaultExecutable = ({
  name,
  bin,
}: NormalizedManifest): undefined | [string, string] => {
  if (!bin) return undefined

  let [, binName] = parseScope(name ?? '')
  if (!binName) return undefined

  // if it's exactly one key, that's the one,
  // even if it doesn't match the name
  const keys = Object.keys(bin)
  if (keys.length === 1) {
    binName = (keys as [string])[0]
  }

  const res = bin[binName]
  if (!res) return undefined

  return [binName, res]
}
