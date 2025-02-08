import { longDependencyTypes } from '@vltpkg/types'
import { asDependencyTypeShort, shorten } from './dependencies.ts'
import { getBooleanFlagsFromNum } from './lockfile/types.ts'
import { stringifyNode } from './stringify-node.ts'
import { loadEdges } from './lockfile/load-edges.ts'
import { loadNodes } from './lockfile/load-nodes.ts'
export * from './types.ts'

const lockfile = {
  loadEdges,
  loadNodes,
}

export {
  asDependencyTypeShort,
  getBooleanFlagsFromNum,
  lockfile,
  longDependencyTypes,
  shorten,
  stringifyNode,
}
