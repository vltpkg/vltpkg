import { longDependencyTypes } from '@vltpkg/types'
import { asDependencyTypeShort, shorten } from './dependencies.ts'
import { getBooleanFlagsFromNum } from './lockfile/types.ts'
import { stringifyNode } from './stringify-node.ts'
import { loadEdges } from './lockfile/load-edges.ts'
import { loadNodes } from './lockfile/load-nodes.ts'
import { load } from './transfer-data/load.ts'
export type {
  LoadResult,
  TransferData,
} from './transfer-data/load.ts'

export * from './virtual-root.ts'

const lockfile = {
  loadEdges,
  loadNodes,
}

const transfer = {
  load,
}

export {
  asDependencyTypeShort,
  getBooleanFlagsFromNum,
  lockfile,
  longDependencyTypes,
  shorten,
  stringifyNode,
  transfer,
}
