/**
 * Pseudo-class names supported by DSS, without the leading `:`.
 */
export const pseudoClassNames = [
  'abandoned',
  'attr',
  'built',
  'confused',
  'cve',
  'cwe',
  'debug',
  'deprecated',
  'dev',
  'diff',
  'dist',
  'dynamic',
  'empty',
  'entropic',
  'env',
  'eval',
  'fs',
  'has',
  'host',
  'hostname',
  'is',
  'license',
  'link',
  'malware',
  'minified',
  'missing',
  'native',
  'network',
  'not',
  'obfuscated',
  'optional',
  'outdated',
  'overridden',
  'path',
  'peer',
  'prerelease',
  'private',
  'prod',
  'project',
  'published',
  'registry',
  'root',
  'scanned',
  'scope',
  'score',
  'scripts',
  'semver',
  'sev',
  'severity',
  'shell',
  'shrinkwrap',
  'skill',
  'spec',
  'squat',
  'suspicious',
  'tracker',
  'trivial',
  'type',
  'undesirable',
  'unknown',
  'unmaintained',
  'unpopular',
  'unstable',
  'v',
  'vuln',
  'vulnerable',
  'workspace',
] as const
export type PseudoClassName = (typeof pseudoClassNames)[number]

/**
 * Part selectors: pseudo-classes that pick a part of the packages
 * their selector matched, e.g. `:skill()`. They must end a top-level
 * selector.
 */
export const partPseudoNames = ['skill'] as const
export type PartPseudoName = (typeof partPseudoNames)[number]

/**
 * Combinators supported by DSS.
 */
export const combinatorNames = ['>', '~', ' '] as const
export type CombinatorName = (typeof combinatorNames)[number]

/**
 * Attribute selector operators supported by DSS.
 */
export const attributeOperatorNames = [
  '=',
  '^=',
  '$=',
  '~=',
  '*=',
  '|=',
] as const
export type AttributeOperatorName =
  (typeof attributeOperatorNames)[number]
