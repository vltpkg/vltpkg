export * from './edge.ts'
export * from './graph.ts'
export * from './node.ts'
export * from './dependencies.ts'
export * from './lockfile/types.ts'
export * from './visualization/json-output.ts'
export * from './visualization/human-readable-output.ts'
export * from './visualization/mermaid-output.ts'
export * from './stringify-node.ts'
export * from './types.ts'

import {
  load as actualLoad,
  type LoadOptions as ActualLoadOptions,
} from './actual/load.ts'
export const actual = { load: actualLoad }

import {
  load as lockfileLoad,
  type LoadOptions as LockfileLoadOptions,
} from './lockfile/load.ts'
import { loadEdges } from './lockfile/load-edges.ts'
import { loadNodes } from './lockfile/load-nodes.ts'
import { save } from './lockfile/save.ts'
export const lockfile = {
  load: lockfileLoad,
  loadEdges,
  loadNodes,
  save,
}

export type { ActualLoadOptions, LockfileLoadOptions }
export type { SaveOptions } from './lockfile/save.ts'

import { type BuildIdealOptions, build } from './ideal/build.ts'
export type { BuildIdealOptions }
export const ideal = { build }
export { reify } from './reify/index.ts'
export type { ReifyOptions } from './reify/index.ts'
