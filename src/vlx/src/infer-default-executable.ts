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

  const binName = name?.startsWith('@') ? name.split('/')[1] : name
  if (!binName) return undefined

  if (typeof bin === 'string') {
    return [binName, bin]
  }

  bin = bin[binName]
  if (!bin) return undefined

  return [binName, bin]
}
