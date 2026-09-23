import { hydrate } from '@vltpkg/dep-id'
import type {
  ExtractResolution,
  PackageInfoClient,
} from '@vltpkg/package-info'
import { platformCheck } from '@vltpkg/pick-manifest'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
import { asManifest, normalizeManifest } from '@vltpkg/types'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { optionalFail } from './optional-fail.ts'
import { removeOptionalSubgraph } from '../remove-optional-subgraph.ts'

/**
 * Result of the extraction operation.
 * Either the extracted package data or an error if extraction failed.
 */
export type ExtractResult =
  | {
      success: true
      node: Node
    }
  | {
      success: false
      node: Node
      error: unknown
    }

/**
 * Returns a function that handles removing
 * a failed optional node from its graph.
 * Returns undefined for non-optional nodes when no diff is provided.
 */
const getOptionalFailedNodeRemover = (node: Node, diff?: Diff) => {
  return (
    diff ? optionalFail(diff, node)
    : node.isOptional() ?
      () => removeOptionalSubgraph(node.graph, node)
    : undefined
  )
}

/**
 * Extract a single node to the file system.
 * Returns a promise that resolves when the extraction is complete.
 */
export const extractNode = async (
  node: Node,
  scurry: PathScurry,
  remover: RollbackRemove,
  options: SpecOptions,
  packageInfo: PackageInfoClient,
  diff?: Diff,
): Promise<ExtractResult> => {
  node.extracted = true
  const { manifest = {} } = node
  const target = node.resolvedLocation(scurry)
  const from = scurry.resolve('')
  const spec = hydrate(node.id, node.name, options)
  const removeOptionalFailedNode = getOptionalFailedNodeRemover(
    node,
    diff,
  )
  const { integrity, resolved } = node

  // Use platform data from node if available (from lockfile), otherwise fall back to manifest
  const platformData = node.platform ?? manifest

  // Check if we should skip this node due to platform incompatibility or deprecation
  if (
    removeOptionalFailedNode &&
    (manifest.deprecated ||
      !platformCheck(
        platformData,
        process.version,
        process.platform,
        process.arch,
        // libc is auto-detected by platformCheck when not provided
      ))
  ) {
    removeOptionalFailedNode()
    return {
      success: false,
      node,
      error: new Error('Platform check failed or package deprecated'),
    }
  }

  // the registry manifest can declare install scripts that the
  // tarball's package.json, read by the global store, lacks
  const { scripts, hasInstallScript } = manifest
  const extractOptions = {
    from,
    integrity,
    resolved,
    fromLockfile: node.resolvedFromLockfile,
    installScripts: !!(
      hasInstallScript ||
      scripts?.install ||
      scripts?.preinstall ||
      scripts?.postinstall
    ),
  }

  const extracted = (r: ExtractResolution): ExtractResult => {
    // Store computed integrity for git/remote deps
    if (r.integrity && !node.integrity) node.integrity = r.integrity
    // a global store link hands over what reify would read from disk;
    // same result as reading it back, or left for that on failure
    if (r.manifest && !node.manifest) {
      try {
        node.manifest = normalizeManifest(
          asManifest(JSON.parse(r.manifest)),
        )
      } catch {}
    }
    if (r.bindingGyp !== undefined) node.bindingGyp = r.bindingGyp
    return { success: true, node }
  }

  try {
    await remover.rm(target)

    if (removeOptionalFailedNode) {
      try {
        return extracted(
          await packageInfo.extract(spec, target, extractOptions),
        )
      } catch (error) {
        removeOptionalFailedNode()
        return { success: false, node, error }
      }
    } else {
      return extracted(
        await packageInfo.extract(spec, target, extractOptions),
      )
    }
  } catch (error) {
    /* c8 ignore start */
    if (removeOptionalFailedNode) {
      removeOptionalFailedNode()
      return { success: false, node, error }
    }
    /* c8 ignore stop */
    throw error
  }
}
