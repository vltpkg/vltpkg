import { error } from '@vltpkg/error-cause'
import {
  asPostcssNodeWithChildren,
  asStringNode,
  asTagNode,
  isStringNode,
  isTagNode,
} from '@vltpkg/dss-parser'
import {
  cveAlertTypes,
  typeImpliedLevel,
} from '@vltpkg/security-archive'
import {
  assertSecurityArchive,
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from './helpers.ts'
import type { ParserState } from '../types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

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

/**
 * Numeric severity derived from {@link typeImpliedLevel}, for the
 * comparison-based `:severity()` selector. Maps the canonical
 * string-level to the numeric scale this module uses (lower = more
 * severe). Only CVE-bearing types are included -- the `:severity()`
 * selector operates on the Vulnerability category.
 */
const severityLevelToNumber: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}
const typeImpliedNumericLevel = new Map<string, number>(
  Object.entries(typeImpliedLevel)
    .filter(([type]) => cveAlertTypes.has(type))
    .map(
      ([type, level]) =>
        [type, severityLevelToNumber[level] ?? 3] as const,
    ),
)

/**
 * The comparable level of a vulnerability alert.
 *
 * Prefers the alert's own `severity` field over its type name, so any
 * grade the feed sends lands somewhere -- `middle` being the wire
 * spelling of `medium` -- and falls back to the type when no severity is
 * given. Returns undefined for alerts outside the Vulnerability
 * category, which `:severity` does not select on.
 */
const alertSeverityLevel = (alert: {
  type: string
  severity?: string
  category?: string
}): number | undefined => {
  if (
    !cveAlertTypes.has(alert.type) &&
    alert.category !== 'vulnerability'
  ) {
    return undefined
  }
  const severity =
    alert.severity === 'middle' ? 'medium' : alert.severity
  const fromSeverity =
    severity ? kindLevelMap.get(severity as SeverityKinds) : undefined
  return fromSeverity ?? typeImpliedNumericLevel.get(alert.type)
}

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
        // and thus can never return an undefined value but ts doesn't
        // know about that, so we have the extra check here
        /* c8 ignore next - impossible */
        if (kindLevel == null) break

        // Check each alert to find any that match our comparison criteria
        for (const alert of report.alerts) {
          const currentAlertLevel = alertSeverityLevel(alert)

          // perform the comparison based on the user-provided kindLevel
          if (currentAlertLevel != null) {
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
        // Exact match on the requested level, again from each alert's
        // own severity rather than a single type name per level.
        const kindLevel = kindLevelMap.get(kind)
        exclude = !report.alerts.some(
          alert => alertSeverityLevel(alert) === kindLevel,
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
