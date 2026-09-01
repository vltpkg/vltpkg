import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { LockfileData } from '../../src/types.ts'

/** `pkg('foo', '1.0.0')` -> a registry DepID; `peer` adds a peer-set hash. */
export const pkg = (
  name: string,
  version: string,
  extra?: string,
  registry = '',
): DepID =>
  joinDepIDTuple(['registry', registry, `${name}@${version}`, extra])

export const ws = (path: string): DepID =>
  joinDepIDTuple(['workspace', path])

export const ROOT = joinDepIDTuple(['file', '.'])

export type NodeSpec = {
  id: DepID
  name: string
  flags?: 0 | 1 | 2 | 3
  integrity?: string
  resolved?: string
  location?: string
  platform?: Record<string, unknown>
  bins?: Record<string, string>
}

export type EdgeSpec = {
  from: DepID
  name: string
  type?: string
  spec?: string
  to: DepID | 'MISSING'
}

export const lockfile = (
  nodes: NodeSpec[],
  edges: EdgeSpec[],
  options: LockfileData['options'] = {},
): LockfileData => ({
  lockfileVersion: 1,
  options,
  nodes: Object.fromEntries(
    nodes.map(n => [
      n.id,
      [
        n.flags ?? 0,
        n.name,
        n.integrity ?? null,
        n.resolved ?? null,
        n.location ?? null,
        null,
        null,
        n.platform ?? null,
        n.bins ?? null,
      ],
    ]),
  ) as LockfileData['nodes'],
  edges: Object.fromEntries(
    edges.map(e => [
      `${e.from} ${e.name}`,
      `${e.type ?? 'prod'} ${e.spec ?? '*'} ${e.to}`,
    ]),
  ) as LockfileData['edges'],
})

export const EMPTY: LockfileData = lockfile([], [])
