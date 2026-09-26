import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { resolve } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Edge } from '../edge.ts'

const rmBinPosix = (remover: RollbackRemove, bin: string) => {
  return [remover.rm(bin)]
}

const rmBinWin32 = (remover: RollbackRemove, bin: string) => {
  return [
    remover.rm(bin),
    remover.rm(bin + '.cmd'),
    remover.rm(bin + '.ps1'),
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
  const { sep } = scurry.cwd
  const nm = edge.from.nodeModules(scurry)
  const path = nm + sep + name.replace('/', sep)
  const binRoot = nm + sep + '.bin'
  const promises: Promise<unknown>[] = []
  promises.push(remover.rm(path))
  const bins = to?.bins
  if (bins) {
    for (const key of Object.keys(bins)) {
      const bin = resolve(binRoot, key)
      promises.push(...rmBin(remover, bin))
    }
  }
  await Promise.all(promises)
}
