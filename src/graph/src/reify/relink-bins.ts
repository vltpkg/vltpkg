import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { resolve } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { linkBin } from './add-edge.ts'

/**
 * A deleted edge removes the bins it owns, but another dependency
 * that did not change may declare the same bin name. Link the first
 * one found if the bin is still missing once added edges are linked.
 */
export const relinkBins = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
): (() => Promise<unknown>)[] => {
  const actions: (() => Promise<unknown>)[] = []
  const seen = new Set<string>()
  const { sep } = scurry.cwd
  for (const deleted of diff.edges.delete) {
    const node = diff.to.nodes.get(deleted.from.id)
    const bins = deleted.to?.bins
    if (!node || !bins) continue
    const nm = node.nodeModules(scurry)
    const binRoot = nm + sep + '.bin'
    for (const key of Object.keys(bins)) {
      const link = resolve(binRoot, key)
      if (seen.has(link)) continue
      seen.add(link)
      for (const edge of node.edgesOut.values()) {
        const val = edge.to?.bins?.[key]
        if (!val) continue
        const path = nm + sep + edge.spec.name.replace('/', sep)
        actions.push(async () => {
          if (await scurry.lstat(link)) return
          await linkBin(path, binRoot, key, val, remover)
        })
        break
      }
    }
  }
  return actions
}
