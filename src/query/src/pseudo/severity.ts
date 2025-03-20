import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '../types.ts'
import type { ParserState, PostcssNode } from '../types.ts'
import { removeNode, removeQuotes } from './helpers.ts'

export type SeverityKinds =
  | '0'
  | '1'
  | '2'
  | '3'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | undefined

export type SeverityAlertTypes =
  | 'criticalCVE'
  | 'cve'
  | 'potentialVulnerability'
  | 'mildCVE'
  | undefined

const kindsMap = new Map<SeverityKinds, SeverityAlertTypes>([
  ['critical', 'criticalCVE'],
  ['high', 'cve'],
  ['medium', 'potentialVulnerability'],
  ['low', 'mildCVE'],
  ['0', 'criticalCVE'],
  ['1', 'cve'],
  ['2', 'potentialVulnerability'],
  ['3', 'mildCVE'],
])
const kinds = new Set(kindsMap.keys())

export const isSeverityKind = (
  value?: string,
): value is SeverityKinds => kinds.has(value as SeverityKinds)

export const asSeverityKind = (value?: string): SeverityKinds => {
  if (!isSeverityKind(value)) {
    throw error('Expected a valid severity kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

export const parseInternals = (
  nodes: PostcssNode[],
): { kind: SeverityKinds } => {
  let kind: SeverityKinds

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    kind = asSeverityKind(
      removeQuotes(
        asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
          .value,
      ),
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    kind = asSeverityKind(
      asTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0]).value,
    )
  }

  return { kind }
}

export const severity = async (state: ParserState) => {
  if (!state.securityArchive) {
    throw new Error(
      'Missing security archive while trying to parse ' +
        'the :severity security selector',
    )
  }

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :severity selector', { cause: err })
  }

  const { kind } = internals
  const alertName = kindsMap.get(kind)
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    const exclude = !report?.alerts.some(
      alert => alert.type === alertName,
    )
    if (exclude) {
      removeNode(state, node)
    }
  }

  return state
}
