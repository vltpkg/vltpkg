import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
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

export type SquatKinds = '0' | '2' | 'critical' | 'medium' | undefined

export type SquatAlertTypes =
  | 'didYouMean'
  | 'gptDidYouMean'
  | undefined

export type SquatComparator = '>' | '<' | '>=' | '<=' | undefined

const kindsMap = new Map<SquatKinds, SquatAlertTypes>([
  ['critical', 'didYouMean'],
  ['medium', 'gptDidYouMean'],
  ['0', 'didYouMean'],
  ['2', 'gptDidYouMean'],
  [undefined, undefined],
])

// Map numerical values to their respective kinds for comparison operations
const kindLevelMap = new Map<SquatKinds, number>([
  ['critical', 0],
  ['medium', 2],
  ['0', 0],
  ['2', 2],
])

const kinds = new Set(kindsMap.keys())

export const isSquatKind = (value?: string): value is SquatKinds =>
  kinds.has(value as SquatKinds)

export const asSquatKind = (value?: string): SquatKinds => {
  if (!isSquatKind(value)) {
    throw error('Expected a valid squat kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

export const parseInternals = (
  nodes: PostcssNode[],
): {
  kind: SquatKinds
  comparator: SquatComparator
} => {
  let kind: SquatKinds
  let comparator: SquatComparator

  let kindValue = ''
  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    kindValue = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    kindValue = asTagNode(
      asPostcssNodeWithChildren(nodes[0]).nodes[0],
    ).value
  }

  // Extract comparator if present
  if (kindValue.startsWith('>=')) {
    comparator = '>='
    kindValue = kindValue.substring(2)
  } else if (kindValue.startsWith('<=')) {
    comparator = '<='
    kindValue = kindValue.substring(2)
  } else if (kindValue.startsWith('>')) {
    comparator = '>'
    kindValue = kindValue.substring(1)
  } else if (kindValue.startsWith('<')) {
    comparator = '<'
    kindValue = kindValue.substring(1)
  }

  // Parse kind value
  if (kindValue) {
    if (isSquatKind(kindValue)) {
      kind = kindValue
    } else {
      throw error('Expected a valid squat kind for comparison', {
        found: kindValue,
        validOptions: Array.from(kinds),
      })
    }
  }

  return { kind, comparator }
}

export const squat = async (state: ParserState) => {
  assertSecurityArchive(state, 'squat')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    if (asError(err).message === 'Expected a query node') {
      // No parameters provided - pseudo state form: match ANY squat level
      internals = { kind: undefined, comparator: undefined }
    } else {
      throw error('Failed to parse :squat selector', { cause: err })
    }
  }

  const { kind, comparator } = internals

  // First pass: Remove nodes without security data
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    // Always exclude nodes that don't have security data or alerts
    if (!report?.alerts || report.alerts.length === 0) {
      removeNode(state, node)
    }
  }

  // Second pass: Apply comparison filtering
  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)

    // Skip if report is undefined
    // (should never happen since we filtered above)
    /* c8 ignore next - impossible */
    if (!report) continue

    // At this point we know report exists and has alerts
    let exclude = true

    if (kind === undefined && comparator === undefined) {
      // Pseudo state form: match ANY squat level
      exclude = !report.alerts.some(alert =>
        [...kindsMap.values()].includes(
          alert.type as SquatAlertTypes,
        ),
      )
    } else if (comparator) {
      // Get the value to compare against
      const kindLevel = kindLevelMap.get(kind)
      /* c8 ignore next - impossible */
      if (kindLevel === undefined) break

      // For each alert, check if it matches the comparison criteria
      let matchesComparison = false
      for (const alert of report.alerts) {
        // Get the alert type
        const alertType = alert.type

        // Find the corresponding kind for this alert type
        const alertLevelKey = [...kindsMap.entries()].find(
          ([_, value]) => value === alertType,
        )?.[0]

        if (alertLevelKey) {
          // Get the numeric level for this alert
          const alertLevel = kindLevelMap.get(alertLevelKey)
          /* c8 ignore next - impossible */
          if (alertLevel === undefined) continue

          // Apply the comparison based on the comparator
          switch (comparator) {
            case '>':
              if (alertLevel > kindLevel) {
                matchesComparison = true
              }
              break
            case '<':
              if (alertLevel < kindLevel) {
                matchesComparison = true
              }
              break
            case '>=':
              if (alertLevel >= kindLevel) {
                matchesComparison = true
              }
              break
            case '<=':
              if (alertLevel <= kindLevel) {
                matchesComparison = true
              }
              break
          }

          // If we found a match, we can stop checking other alerts
          if (matchesComparison) break
        }
      }

      // Exclude the node if it doesn't match the comparison
      exclude = !matchesComparison
    } else {
      // Original exact match behavior
      const alertName = kindsMap.get(kind)
      exclude = !report.alerts.some(alert => alert.type === alertName)
    }

    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
