import { error } from '@vltpkg/error-cause'
import type { PathScurry } from 'path-scurry'
import type { PackageJson } from '@vltpkg/package-json'
import type { Diff } from '../diff.ts'
import type { GraphModifier } from '../modifiers.ts'
import type { Node } from '../node.ts'
import type { NormalizedManifest } from '@vltpkg/types'
import { hasBindingGyp } from './binding-gyp.ts'
import { scriptsManifest } from './scripts-manifest.ts'

/**
 * Build data containing the queue of DepIDs that need building
 */
export type BuildData = {
  needsBuildNodes: Node[]
}

/**
 * Options for checking needed build data
 */
export type CheckNeededBuildOptions = {
  /**
   * The diff object containing nodes to process
   */
  diff: Diff
  /**
   * PathScurry instance for filesystem access
   */
  scurry: PathScurry
  /**
   * PackageJson instance for reading manifests from disk
   */
  packageJson: PackageJson
  /**
   * Graph modifiers, whose `-` entries remove dependencies on purpose
   */
  modifiers?: GraphModifier
}

/**
 * Fail when an extracted package lists a dependency that has no edge
 * in the lockfile, the way `npm ci` refuses a lockfile missing one.
 */
const assertDepsLocked = (
  node: Node,
  manifest: NormalizedManifest,
  modifiers?: GraphModifier,
) => {
  if (!node.inVltStore()) return
  // publish normalizes these on the registry only, not in the tarball
  const { bundleDependencies, bundledDependencies } = manifest as {
    bundleDependencies?: unknown
    bundledDependencies?: unknown
  }
  const bundled = bundleDependencies ?? bundledDependencies
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (
      node.edgesOut.get(name)?.to ||
      bundled === true ||
      (Array.isArray(bundled) && bundled.includes(name)) ||
      manifest.optionalDependencies?.[name] !== undefined ||
      modifiers?.removesEdge(name)
    )
      continue
    const names =
      [...new Set([...node.edgesIn].map(e => e.name))].join(' ') ||
      node.name
    throw error(
      `${node} depends on ${name}, which is missing from vlt-lock.json. ` +
        `Run \`vlt update ${names}\` to repair it.`,
      { found: node.id },
    )
  }
}

/**
 * Checks if a node needs to be built based on the conditions from build.ts:
 * 1. Has install lifecycle scripts (install, preinstall, postinstall)
 * 2. Has binding.gyp file with no install/preinstall scripts (implicit install)
 * 3. Is an importer or git dependency with prepare scripts (prepare, preprepare, postprepare)
 * 4. Has binary files that need to be linked
 */
const nodeNeedsBuild = (
  node: Node,
  scurry: PathScurry,
  packageJson: PackageJson,
  modifiers?: GraphModifier,
): boolean => {
  // If the node has already been built during reify, no need to build
  // again. A link: target is never built.
  if (node.built || node.isLinkTarget()) return false

  // If the manifest is not available on the node, read it from disk.
  // This can happen when the ideal graph is loaded from a lockfile
  // and there's no actual graph available to hydrate the manifest data from.
  // An abbreviated registry manifest carries `hasInstallScript` in place
  // of `scripts` and is likewise resolved from disk.
  let pkg: NormalizedManifest
  let manifest: NormalizedManifest
  try {
    const dir = node.resolvedLocation(scurry)
    pkg = node.manifest ??= packageJson.read(dir)
    manifest = scriptsManifest(pkg, dir, packageJson)
  } catch {
    // If the manifest cannot be read (missing/corrupted), treat as
    // "no build needed" to avoid failing the entire reification.
    return false
  }

  // the edges were built from the node's manifest, not the scripts one
  assertDepsLocked(node, pkg, modifiers)

  const { scripts = {} } = manifest

  // Check for install lifecycle scripts
  const runInstall = !!(
    scripts.install ||
    scripts.preinstall ||
    scripts.postinstall
  )
  if (runInstall) return true

  // Check for binding.gyp file (npm's implicit install detection)
  // "If there is a binding.gyp file in the root of your package and you
  // haven't defined your own install or preinstall scripts, npm will default
  // the install command to compile using node-gyp via node-gyp rebuild"
  if (
    hasBindingGyp(node, scurry) &&
    !scripts.install &&
    !scripts.preinstall
  )
    return true

  // Check for prepare scripts on importers or git dependencies
  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(
      scripts.prepare || scripts.preprepare || scripts.postprepare
      /* c8 ignore next 2 */
    ) && prepable
  if (runPrepare) return true

  return false
}

/**
 * Check which nodes need to be built and set buildState accordingly
 * Marks nodes with buildState = 'needed' for those that require
 * install lifecycle scripts as part of `vlt build`
 * @returns {BuildData} The BuildData object containing Node objects that need building
 */
export const checkNeededBuild = (
  options: CheckNeededBuildOptions,
): BuildData => {
  const { diff, scurry, packageJson, modifiers } = options

  // Filter nodes to only include those that actually need to be built
  const nodesToBuild = [...diff.nodes.add].filter(node =>
    nodeNeedsBuild(node, scurry, packageJson, modifiers),
  )

  // Set buildState = 'needed' on all nodes that require building
  for (const node of nodesToBuild) {
    node.buildState = 'needed'
  }

  const buildData: BuildData = {
    needsBuildNodes: nodesToBuild,
  }

  return buildData
}

/**
 * Copy build state from the actual graph onto ideal nodes that are
 * not re-extracted, since `vlt-lock.json` does not store it.
 */
export const carryBuildState = (diff: Diff): void => {
  for (const [id, node] of diff.to.nodes) {
    // a link: target is never built
    if (diff.nodes.add.has(node) || node.isLinkTarget()) continue
    const prev = diff.from.nodes.get(id)
    if (prev) node.buildState = prev.buildState
  }
}
