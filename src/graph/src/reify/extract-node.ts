import { hydrate } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { platformCheck } from '@vltpkg/pick-manifest'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { SpecOptions } from '@vltpkg/spec'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { optionalFail } from './optional-fail.ts'

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
 * Extract a single node to the file system.
 * Returns a promise that resolves when the extraction is complete.
 * @param {Node} node - The node to extract
 * @param {PathScurry} scurry - PathScurry instance for path resolution
 * @param {RollbackRemove} remover - RollbackRemove instance for safe file operations
 * @param {SpecOptions} options - Spec options for hydrating the spec
 * @param {PackageInfoClient} packageInfo - PackageInfoClient for extracting the package
 * @param {Diff} diff - Diff instance for handling optional failures
 * @returns {Promise<ExtractResult>} Promise that resolves to ExtractResult
 */
export const extractNode = async (
  node: Node,
  scurry: PathScurry,
  remover: RollbackRemove,
  options: SpecOptions,
  packageInfo: PackageInfoClient,
  diff: Diff,
): Promise<ExtractResult> => {
  const { manifest = {} } = node
  const target = node.resolvedLocation(scurry)
  const from = scurry.resolve('')
  const spec = hydrate(node.id, node.name, options)
  const onErr = optionalFail(diff, node)
  const { integrity, resolved } = node

  // Use platform data from node if available (from lockfile), otherwise fall back to manifest
  const platformData = node.platform ?? manifest

  // Check if we should skip this node due to platform incompatibility or deprecation
  if (
    onErr &&
    (manifest.deprecated ||
      !platformCheck(
        platformData,
        process.version,
        process.platform,
        process.arch,
      ))
  ) {
    onErr()
    return {
      success: false,
      node,
      error: new Error('Platform check failed or package deprecated'),
    }
  }

  try {
    await remover.rm(target)

    if (onErr) {
      try {
        await packageInfo.extract(spec, target, {
          from,
          integrity,
          resolved,
        })
        return { success: true, node }
      } catch (error) {
        onErr()
        return { success: false, node, error }
      }
    } else {
      await packageInfo.extract(spec, target, {
        from,
        integrity,
        resolved,
      })
      return { success: true, node }
    }
  } catch (error) {
    if (onErr) {
      onErr()
      return { success: false, node, error }
    }
    throw error
  }
}
