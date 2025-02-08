import { type RollbackRemove } from '@vltpkg/rollback-remove'
import { type PathScurry } from 'path-scurry'
import { type Edge } from '../edge.ts'
import { binPaths } from './bin-paths.ts'

const rmBinPosix = (remover: RollbackRemove, bin: string) => {
  return [remover.rm(bin)]
}

const rmBinWin32 = (remover: RollbackRemove, bin: string) => {
  return [
    remover.rm(bin),
    remover.rm(bin + '.cmd'),
    remover.rm(bin + '.pwsh'),
  ]
}

const rmBin = process.platform === 'win32' ? rmBinWin32 : rmBinPosix

export const deleteEdge = async (
  edge: Edge,
  scurry: PathScurry,
  remover: RollbackRemove,
) => {
  const {
    spec: { name },
    to,
  } = edge
  const nm = edge.from.nodeModules(scurry)
  const path = scurry.resolve(nm, name)
  const binRoot = scurry.cwd.resolve(`${nm}/.bin`)
  const promises: Promise<unknown>[] = []
  promises.push(remover.rm(path))
  const manifest = to?.manifest
  if (manifest) {
    for (const key of Object.keys(binPaths(manifest))) {
      const bin = binRoot.resolve(key).fullpath()
      promises.push(...rmBin(remover, bin))
    }
  }
  await Promise.all(promises)
}
