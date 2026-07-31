import type { NormalizedManifest } from '@vltpkg/types'

/**
 * Returns true if the manifest has build-relevant lifecycle scripts:
 * install, preinstall, postinstall, prepare, preprepare, or postprepare.
 */
export const computeHasScripts = (
  manifest?: NormalizedManifest | null,
): boolean => {
  const scripts = manifest?.scripts
  if (!scripts) return false
  return !!(
    scripts.install ||
    scripts.preinstall ||
    scripts.postinstall ||
    scripts.prepare ||
    scripts.preprepare ||
    scripts.postprepare
  )
}
