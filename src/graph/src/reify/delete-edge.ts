import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { readCmdShimIfExists } from '@vltpkg/cmd-shim'
import { resolve } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Edge } from '../edge.ts'

const binPathsPosix = (bin: string) => [bin]

const binPathsWin32 = (bin: string) => [
  bin,
  bin + '.cmd',
  bin + '.ps1',
]

const binPaths =
  process.platform === 'win32' ? binPathsWin32 : binPathsPosix

export const deleteEdge = async (
  edge: Edge,
  scurry: PathScurry,
  remover: RollbackRemove,
) => {
  const {
    spec: { name },
    to,
  } = edge
  const { sep } = scurry.cwd
  const nm = edge.from.nodeModules(scurry)
  const path = nm + sep + name.replace('/', sep)
  const binRoot = nm + sep + '.bin'
  const promises: Promise<unknown>[] = []
  promises.push(remover.rm(path))
  const bins = to?.bins
  if (bins) {
    for (const [key, value] of Object.entries(bins)) {
      for (const bin of binPaths(resolve(binRoot, key))) {
        const target = await readCmdShimIfExists(bin)
        // another dependency may provide the same command.
        if (target && target !== resolve(path, value)) continue
        promises.push(remover.rm(bin))
      }
    }
  }
  await Promise.all(promises)
}
