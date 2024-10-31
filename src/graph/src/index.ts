export * from './edge.js'
export * from './graph.js'
export * from './node.js'
export * from './dependencies.js'
export * from './lockfile/types.js'
export * from './visualization/json-output.js'
export * from './visualization/human-readable-output.js'
export * from './visualization/mermaid-output.js'
export * from './stringify-node.js'
export * from './types.js'

import {
  load as actualLoad,
  type LoadOptions as ActualLoadOptions,
} from './actual/load.js'
export const actual = { load: actualLoad }

import {
  load as lockfileLoad,
  type LoadOptions as LockfileLoadOptions,
} from './lockfile/load.js'
import { loadEdges } from './lockfile/load-edges.js'
import { loadNodes } from './lockfile/load-nodes.js'
import { save } from './lockfile/save.js'
export const lockfile = {
  load: lockfileLoad,
  loadEdges,
  loadNodes,
  save,
}

export type { ActualLoadOptions, LockfileLoadOptions }
export type { SaveOptions } from './lockfile/save.js'

import { type BuildIdealOptions, build } from './ideal/build.js'
export type { BuildIdealOptions }
export const ideal = { build }
export { reify } from './reify/index.js'
export type { ReifyOptions } from './reify/index.js'
