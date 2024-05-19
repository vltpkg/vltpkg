import type { PickManifestOptionsNoBefore } from '@vltpkg/pick-manifest'
import type { Spec } from '@vltpkg/spec'
import type { SpawnOptions } from 'child_process'
import type { WrapOptions } from 'retry'

export * from './clone.js'
export * from './find.js'
export * from './is-clean.js'
export * from './is.js'
export * from './resolve.js'
export * from './revs.js'
export * from './spawn.js'

/**
 * This extends all options that can be passed to spawn() or pickManifest.
 */
export interface GitOptions
  extends SpawnOptions,
    PickManifestOptionsNoBefore {
  /** the path to git binary, or 'false' to prevent all git operations */
  git?: string | false
  /** the current working directory to perform git operations in */
  cwd?: string
  /** Parsed git specifier to be cloned, if we have one */
  spec?: Spec
  /**
   * Set to a boolean to force cloning with/without `--depth=1`. If left
   * undefined, then shallow cloning will only be performed on hosts known to
   * support it.
   */
  'git-shallow'?: boolean
  /** Only relevant if `retry` is unset. Value for retry.retries, default 2 */
  'fetch-retries'?: WrapOptions['retries']
  /** Only relevant if `retry` is unset. Value for retry.factor, default 10 */
  'fetch-retry-factor'?: WrapOptions['factor']
  /**
   * Only relevant if `retry` is unset. Value for retry.maxTimeout, default
   * 60_000
   */
  'fetch-retry-maxtimeout'?: WrapOptions['maxTimeout']
  /**
   * Only relevant if `retry` is unset. Value for retry.minTimeout, default
   * 1_000
   */
  'fetch-retry-mintimeout'?: WrapOptions['minTimeout']
  /**
   * Used to test platform-specific behavior.
   * @internal
   */
  fakePlatform?: NodeJS.Platform
  /**
   * Just to test rev lookup without continually clearing the cache
   */
  noGitRevCache?: boolean
}
