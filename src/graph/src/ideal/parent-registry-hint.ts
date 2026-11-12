import { getTuple, splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import type { Spec } from '@vltpkg/spec'
import { isErrorWithCause, isObject } from '@vltpkg/types'
import type { Node } from '../node.ts'

/**
 * Explain a registry 404 for a dependency with no registry prefix whose
 * parent came from another registry: it resolves from the root
 * configuration, not from where its parent was found. Any other error
 * is returned as is.
 */
export const withParentRegistryHint = (
  er: unknown,
  spec: Spec,
  fromNode: Node,
): unknown => {
  if (!isErrorWithCause(er) || !isObject(er.cause)) return er
  const cause = er.cause as ErrorCauseOptions
  const response = cause.response as
    { statusCode?: unknown } | undefined
  const [type, parent] = splitDepID(fromNode.id)
  if (
    response?.statusCode !== 404 ||
    type !== 'registry' ||
    // a prefix or a scoped-registries entry is the user's own routing
    spec.type !== 'registry' ||
    spec.subspec ||
    spec.scopeRegistry ||
    // jsr hosts only @jsr/* names, which the @jsr scope routes
    spec.options['jsr-registries'][parent] !== undefined
  ) {
    return er
  }
  const [, requested] = getTuple(spec, { name: spec.name })
  if (requested === parent) return er
  return error(
    `${er.message}\n${spec.name} has no registry prefix, so it was ` +
      `requested from ${requested}, but its parent ${fromNode.name} ` +
      `came from ${parent}. To install it from ${parent}, give it a ` +
      `registry prefix with a graph modifier in vlt.json, or map its ` +
      `scope in scoped-registries.`,
    { ...cause, cause: er },
    withParentRegistryHint,
  )
}
