import { findCmdShimIfExists } from '@vltpkg/cmd-shim'
import { relative, resolve } from 'node:path'
import { walkUp } from 'walk-up-path'

/**
 * Find the executable in a node_modules/.bin folder between the cwd
 * and the projectRoot.
 *
 * Returns `[executable, target]` showing the package origin.
 */
export const findExecutable = async (
  arg0: string,
  projectRoot: string,
) => {
  for (const path of walkUp(process.cwd())) {
    const bin = await findCmdShimIfExists(
      resolve(path, 'node_modules/.bin', arg0),
    )
    if (bin) return bin[0]
    if (relative(path, projectRoot) === '') break
  }
}
