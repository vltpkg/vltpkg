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

export type CveInternals = {
  cveId: string | undefined
}

export const parseInternals = (
  nodes: PostcssNode[],
): CveInternals => {
  if (!nodes[0]) {
    return { cveId: undefined }
  }

  const selectorNode = asPostcssNodeWithChildren(nodes[0])
  if (!selectorNode.nodes[0]) {
    return { cveId: undefined }
  }

  let cveId = ''

  if (isStringNode(selectorNode.nodes[0])) {
    cveId = removeQuotes(asStringNode(selectorNode.nodes[0]).value)
  } else if (isTagNode(selectorNode.nodes[0])) {
    cveId = asTagNode(selectorNode.nodes[0]).value
  }

  /* c8 ignore start - unreachable via normal parser */
  if (!cveId) {
    throw error('Expected a CVE ID', {
      found: selectorNode.nodes[0],
    })
  }
  /* c8 ignore stop */

  return { cveId }
}

/**
 * Filters out any node that does not have a CVE alert.
 *
 * Usage:
 * - :cve - matches any package with at least one CVE alert
 * - :cve(CVE-2023-1234) - matches only the specific CVE ID
 */
export const cve = async (state: ParserState) => {
  assertSecurityArchive(state, 'cve')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) /* c8 ignore start */ {
    throw error('Failed to parse :cve selector', { cause: err })
  } /* c8 ignore stop */

  const { cveId } = internals
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    let exclude: boolean
    if (cveId === undefined) {
      exclude = !report?.alerts.some(alert => alert.props?.cveId)
    } else {
      exclude = !report?.alerts.some(
        alert =>
          alert.props?.cveId?.trim().toLowerCase() ===
          cveId.trim().toLowerCase(),
      )
    }
    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
