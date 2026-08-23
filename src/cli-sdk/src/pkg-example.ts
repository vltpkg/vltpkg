import { unpack } from '@vltpkg/tar/unpack'
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TARBALL_URL =
  'https://codeload.github.com/vltpkg/package-examples/tar.gz/main'

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

  const res = await fetch(TARBALL_URL)
  const tarData = Buffer.from(await res.arrayBuffer())

  const scratch = await mkdtemp(join(tmpdir(), 'vlt-pkg-example-'))
  try {
    await unpack(tarData, scratch)
    await cp(join(scratch, 'packages', 'vlt'), targetDir, {
      recursive: true,
    })
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}
