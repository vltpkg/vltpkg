import type { DependencyTypeShort } from '@vltpkg/types'

export const dependencyFilters: { name: DependencyTypeShort }[] = [
  { name: 'prod' },
  { name: 'dev' },
  { name: 'peer' },
  { name: 'optional' },
  { name: 'peerOptional' },
]

export type Filter =
  | 'dev'
  | 'prod'
  | 'peer'
  | 'optional'
  | 'peerOptional'
  | `search:${string}`
