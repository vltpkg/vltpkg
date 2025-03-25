import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '../types.ts'
import type { ParserState, PostcssNode } from '../types.ts'
import {
  assertSecurityArchive,
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from './helpers.ts'

export type CweInternals = {
  cweId: string
}

export const parseInternals = (
  nodes: PostcssNode[],
): CweInternals => {
  let cweId = ''

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    cweId = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    cweId = asTagNode(
      asPostcssNodeWithChildren(nodes[0]).nodes[0],
    ).value
  }

  if (!cweId) {
    throw error('Expected a CWE ID', {
      found: asPostcssNodeWithChildren(nodes[0]).nodes[0],
    })
  }

  return { cweId }
}

/**
 * Filters out any node that does not have a CWE alert with the specified CWE ID.
 */
export const cwe = async (state: ParserState) => {
  assertSecurityArchive(state.securityArchive, 'cwe')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :cwe selector', { cause: err })
  }

  const { cweId } = internals
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    const exclude = !report?.alerts.some(alert =>
      alert.props.cwes.some(
        cwe =>
          cwe.id.trim().toLowerCase() === cweId.trim().toLowerCase(),
      ),
    )
    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
