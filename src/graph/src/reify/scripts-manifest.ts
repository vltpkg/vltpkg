import type { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest } from '@vltpkg/types'

/**
 * The manifest to consult for lifecycle scripts. An abbreviated registry
 * manifest replaces `scripts` with `hasInstallScript`, in which case the
 * extracted package.json at `dir` is canonical.
 */
export const scriptsManifest = (
  manifest: NormalizedManifest,
  dir: string,
  packageJson: PackageJson,
): NormalizedManifest =>
  manifest.hasInstallScript && !manifest.scripts ?
    packageJson.read(dir)
  : manifest
