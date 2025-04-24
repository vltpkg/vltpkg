import type { InstallOptions } from '@vltpkg/graph'
import type {
  PackageInfoClientOptions,
  PackageInfoClientRequestOptions,
  Resolution,
} from '@vltpkg/package-info'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import type { Integrity, Manifest } from '@vltpkg/types'

export type VlxManifest = Manifest & {
  vlx?: {
    integrity?: Integrity
    signatures?: Resolution['signatures']
  }
}

/**
 * Provide a promptFn which is `()=>Promise<string>` if you want to confirm
 * before installing things. If it returns a string that does not start with
 * the letter 'y', then operation will be aborted. If not provided, consent is
 * assumed.
 */
export type PromptFn = (
  pkgSpec: Spec,
  path: string,
  resolution: string,
) => Promise<string>

/** The info about a given vlx installation */
export type VlxInfo = VlxManifest['vlx'] & {
  /** name of the package that is being run */
  name: string

  /** version of the package being run */
  version?: string

  /**
   * path to the synthetic project for non-local installs, or to the
   * current projectRoot if the resolution is local.
   */
  path: string

  /**
   * resolution of the package installed, for non-local installs,
   * or a file URL into the node_modules for project local installs.
   */
  resolved: string

  /**
   * Full path to the inferred default binary for the dependency if it exists.
   */
  arg0?: string
}

export type VlxOptions = SpecOptions &
  PackageInfoClientOptions &
  PackageInfoClientRequestOptions &
  InstallOptions & {
    package?: string
    yes?: boolean
  }

export { vlxDelete as delete } from './delete.ts'
export { vlxInfo as info } from './info.ts'
export { vlxInstall as install } from './install.ts'
export { vlxList as list } from './list.ts'
export { vlxResolve as resolve } from './resolve.ts'
