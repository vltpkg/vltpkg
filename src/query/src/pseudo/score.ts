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
import type { PackageScore } from '@vltpkg/security-archive'

export type ScoreKinds = keyof PackageScore

export type ScoreComparator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '='
  | undefined

const kinds = new Set<ScoreKinds | undefined>([
  'overall',
  'license',
  'maintenance',
  'quality',
  'supplyChain',
  'vulnerability',
  undefined,
])

export const isScoreKind = (value?: string): value is ScoreKinds =>
  kinds.has(value as ScoreKinds)

export const asScoreKind = (value?: string): ScoreKinds => {
  if (!isScoreKind(value)) {
    throw error('Expected a valid score kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

export const parseInternals = (
  nodes: PostcssNode[],
): {
  comparator: ScoreComparator
  rate: number
  kind: ScoreKinds
} => {
  let rateStr = ''
  let comparator: ScoreComparator = '='
  let kind: ScoreKinds = 'overall'

  // Parse the first parameter (rate with optional comparator)
  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    rateStr = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    const tagNode = asTagNode(
      asPostcssNodeWithChildren(nodes[0]).nodes[0],
    )
    rateStr = tagNode.value
  }

  // Extract comparator if present
  if (rateStr.startsWith('>=')) {
    comparator = '>='
    rateStr = rateStr.substring(2)
  } else if (rateStr.startsWith('<=')) {
    comparator = '<='
    rateStr = rateStr.substring(2)
  } else if (rateStr.startsWith('>')) {
    comparator = '>'
    rateStr = rateStr.substring(1)
  } else if (rateStr.startsWith('<')) {
    comparator = '<'
    rateStr = rateStr.substring(1)
  }

  // Parse rate as number
  let rate = parseFloat(rateStr)

  // Normalize to 0-1 range if needed
  if (rate > 1) {
    rate = rate / 100
  }

  // Validate rate is in acceptable range
  if (rate < 0 || rate > 1) {
    throw error('Expected rate to be between 0 and 100', {
      found: rateStr,
    })
  }

  // Parse the second parameter (kind) if present
  if (nodes.length > 1) {
    if (isStringNode(asPostcssNodeWithChildren(nodes[1]).nodes[0])) {
      kind = asScoreKind(
        removeQuotes(
          asStringNode(asPostcssNodeWithChildren(nodes[1]).nodes[0])
            .value,
        ),
      )
    } else if (
      isTagNode(asPostcssNodeWithChildren(nodes[1]).nodes[0])
    ) {
      kind = asScoreKind(
        asTagNode(asPostcssNodeWithChildren(nodes[1]).nodes[0]).value,
      )
    }
  }

  return { comparator, rate, kind }
}

export const score = async (state: ParserState) => {
  assertSecurityArchive(state, 'score')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :score selector', { cause: err })
  }

  const { comparator, rate, kind } = internals
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    if (!report) {
      removeNode(state, node)
      continue
    }

    const scoreValue = report.score[kind]

    let exclude = false
    switch (comparator) {
      case '>':
        exclude = scoreValue <= rate
        break
      case '<':
        exclude = scoreValue >= rate
        break
      case '>=':
        exclude = scoreValue < rate
        break
      case '<=':
        exclude = scoreValue > rate
        break
      default: // '='
        exclude = scoreValue !== rate
        break
    }

    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
