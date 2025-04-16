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

export type SeverityComparator = '>' | '<' | '>=' | '<=' | undefined

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

// Map numerical values to their respective kinds for comparison operations
const kindLevelMap = new Map<SeverityKinds, number>([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
  ['0', 0],
  ['1', 1],
  ['2', 2],
  ['3', 3],
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
): {
  kind: SeverityKinds
  comparator: SeverityComparator
} => {
  let kind: SeverityKinds
  let comparator: SeverityComparator

  if (nodes.length === 0) {
    throw error('Missing severity kind parameter')
  }

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
    if (isSeverityKind(kindValue)) {
      kind = kindValue
    } else {
      throw error(
        'Expected a valid severity kind or number between 0-3',
        {
          found: kindValue,
        },
      )
    }
  }

  return { kind, comparator }
}

export const severity = async (state: ParserState) => {
  assertSecurityArchive(state, 'severity')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :severity selector', { cause: err })
  }

  const { kind, comparator } = internals

  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    // Always exclude nodes that don't have security data or alerts
    if (!report?.alerts || report.alerts.length === 0) {
      removeNode(state, node)
    }
  }

  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    let exclude = true

    if (report) {
      if (comparator) {
        // retrieve the value to compare against
        const kindLevel = kindLevelMap.get(kind)
        // the kindLevel value has already been validated at this point
        // and thus can never return an undefined/falsy value but ts doesn't
        // know about that, so we have the extra check here
        /* c8 ignore next - impossible */
        if (!kindLevel) break

        // Check each alert to find any that match our comparison criteria
        for (const alert of report.alerts) {
          // Get the numerical value of the alert type
          const alertType = alert.type as SeverityAlertTypes

          // retrieve a key to the current alert level to be compared against
          const currentAlertLevelKey = [...kindsMap.entries()].find(
            ([_, alertValue]) => alertValue === alertType,
          )?.[0]

          // perform the comparison based on the user-provided kindLevel
          if (currentAlertLevelKey) {
            const currentAlertLevel = kindLevelMap.get(
              currentAlertLevelKey,
            )
            /* c8 ignore next - impossible but ts doesn't know */
            if (currentAlertLevel == null) continue

            switch (comparator) {
              case '>':
                if (currentAlertLevel > kindLevel) {
                  exclude = false
                }
                break
              case '<':
                if (currentAlertLevel < kindLevel) {
                  exclude = false
                }
                break
              case '>=':
                if (currentAlertLevel >= kindLevel) {
                  exclude = false
                }
                break
              case '<=':
                if (currentAlertLevel <= kindLevel) {
                  exclude = false
                }
                break
            }
          }
        }
      } else {
        // Original exact match behavior
        const alertName = kindsMap.get(kind)
        exclude = !report.alerts.some(
          alert => alert.type === alertName,
        )
      }
    }

    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
