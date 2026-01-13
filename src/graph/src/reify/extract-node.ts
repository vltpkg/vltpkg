import { hydrate } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { platformCheck } from '@vltpkg/pick-manifest'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
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

  try {
    await remover.rm(target)

    if (removeOptionalFailedNode) {
      try {
        const result = await packageInfo.extract(spec, target, {
          from,
          integrity,
          resolved,
        })
        // Store computed integrity for git/remote deps
        if (result.integrity && !node.integrity) {
          node.integrity = result.integrity
        }
        return { success: true, node }
      } catch (error) {
        removeOptionalFailedNode()
        return { success: false, node, error }
      }
    } else {
      const result = await packageInfo.extract(spec, target, {
        from,
        integrity,
        resolved,
      })
      // Store computed integrity for git/remote deps
      if (result.integrity && !node.integrity) {
        node.integrity = result.integrity
      }
      return { success: true, node }
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
