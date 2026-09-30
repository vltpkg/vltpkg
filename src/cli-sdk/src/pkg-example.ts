import { spawn } from '@vltpkg/git'
import { PackageInfoClient } from '@vltpkg/package-info'
import { readdir } from 'node:fs/promises'

const PKG_EXAMPLE_SPEC =
  'pkg-example@git+https://github.com/vltpkg/package-examples.git#main::path:packages/vlt'

/**
 * Scaffold the `packages/vlt` example from `vltpkg/package-examples`
 * into `targetDir`, for the "publish your first package" tutorial.
 */
export const createPkgExample = async (
  targetDir: string,
): Promise<void> => {
  const existing = await readdir(targetDir).catch((err: unknown) => {
    /* c8 ignore start */
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    /* c8 ignore stop */
    return []
  })
  if (existing.length) {
    throw new Error(
      `Target directory "${targetDir}" already exists and is not empty`,
    )
  }

  await spawn(['--version']).catch((err: unknown) => {
    throw new Error(
      'git is required to scaffold this example. Install git and make sure it is available in your PATH.',
      { cause: err },
    )
  })

  await new PackageInfoClient().extract(PKG_EXAMPLE_SPEC, targetDir)
}
