export type DependencyTypeLong =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'
export type DependencyTypeShort =
  | 'prod'
  | 'dev'
  | 'peer'
  | 'optional'
  | 'peerOptional'

/**
 * Maps between long form names usually used in `package.json` files
 * to a corresponding short form name, used in lockfiles.
 */
export const dependencyTypes: Map<
  DependencyTypeLong,
  DependencyTypeShort
> = new Map([
  ['dependencies', 'prod'],
  ['devDependencies', 'dev'],
  ['peerDependencies', 'peer'],
  ['optionalDependencies', 'optional'],
])

/**
 * Maps between short form names to the corresponding long form name.
 */
export const longTypes: Map<DependencyTypeShort, DependencyTypeLong> =
  new Map([
    ['prod', 'dependencies'],
    ['dev', 'devDependencies'],
    ['peer', 'peerDependencies'],
    ['optional', 'optionalDependencies'],
  ])
