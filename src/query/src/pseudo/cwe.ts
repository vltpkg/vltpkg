import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import {
  assertSecurityArchive,
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from './helpers.ts'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

export type CweInternals = {
  cweId: string | undefined
}

export const parseInternals = (
  nodes: PostcssNode[],
): CweInternals => {
  if (!nodes[0]) {
    return { cweId: undefined }
  }

  const selectorNode = asPostcssNodeWithChildren(nodes[0])
  if (!selectorNode.nodes[0]) {
    return { cweId: undefined }
  }

  let cweId = ''

  if (isStringNode(selectorNode.nodes[0])) {
    cweId = removeQuotes(asStringNode(selectorNode.nodes[0]).value)
  } else if (isTagNode(selectorNode.nodes[0])) {
    cweId = asTagNode(selectorNode.nodes[0]).value
  }

  /* c8 ignore start - unreachable via normal parser */
  if (!cweId) {
    throw error('Expected a CWE ID', {
      found: selectorNode.nodes[0],
    })
  }
  /* c8 ignore stop */

  return { cweId }
}

/**
 * Filters out any node that does not have a CWE alert.
 *
 * Usage:
 * - :cwe - matches any package with at least one CWE alert
 * - :cwe(CWE-79) - matches only the specific CWE ID
 */
export const cwe = async (state: ParserState) => {
  assertSecurityArchive(state, 'cwe')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) /* c8 ignore start */ {
    throw error('Failed to parse :cwe selector', { cause: err })
  } /* c8 ignore stop */

  const { cweId } = internals
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    let exclude: boolean
    if (cweId === undefined) {
      exclude = !report?.alerts.some(
        alert => alert.props?.cwes && alert.props.cwes.length > 0,
      )
    } else {
      exclude = !report?.alerts.some(alert =>
        alert.props?.cwes?.some(
          cwe =>
            cwe.id.trim().toLowerCase() ===
            cweId.trim().toLowerCase(),
        ),
      )
    }
    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
