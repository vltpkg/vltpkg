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

export type VulnKinds =
  | '0'
  | '1'
  | '2'
  | '3'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | undefined

export type VulnComparator = '>' | '<' | '>=' | '<=' | undefined

// Valid vulnerability kind names
const kinds = new Set<string | undefined>([
  'critical',
  'high',
  'medium',
  'low',
  '0',
  '1',
  '2',
  '3',
])

// Map numerical values to their respective kinds for comparison operations
const kindLevelMap = new Map<VulnKinds, number>([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
  ['0', 0],
  ['1', 1],
  ['2', 2],
  ['3', 3],
])

// Maps alert types to their severity level for comparison operations.
// gptSecurity maps to medium (2), gptAnomaly maps to low (3).
const alertLevelMap = new Map<string, number>([
  ['criticalCVE', 0],
  ['cve', 1],
  ['potentialVulnerability', 2],
  ['gptSecurity', 2],
  ['mildCVE', 3],
  ['gptAnomaly', 3],
])

// Maps alert.severity strings to numeric levels for cveId-bearing alerts
// whose type may not be in alertLevelMap.
const severityLevelMap = new Map<string, number>([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
])

/**
 * Returns the severity level for an alert, considering both its type
 * (via alertLevelMap) and its cveId + severity fields. Alerts with a
 * cveId are treated as vulnerability alerts even if their type is not
 * in the closed set.
 */
const getAlertLevel = (alert: {
  type: string
  severity?: string
  props?: { cveId?: string }
}): number | undefined => {
  const level = alertLevelMap.get(alert.type)
  if (level != null) return level
  // Fall back to severity field for alerts carrying a CVE id
  if (alert.props?.cveId && alert.severity) {
    return severityLevelMap.get(alert.severity)
  }
  return undefined
}

export const isVulnKind = (value?: string): value is VulnKinds =>
  kinds.has(value as VulnKinds)

export const asVulnKind = (value?: string): VulnKinds => {
  if (!isVulnKind(value)) {
    throw error('Expected a valid vuln kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

export const parseInternals = (
  nodes: PostcssNode[],
): { kind: VulnKinds; comparator: VulnComparator } => {
  // Handle case where no parameters are provided (parameterless :vuln)
  if (!nodes[0]) {
    return { kind: undefined, comparator: undefined }
  }

  const selectorNode = asPostcssNodeWithChildren(nodes[0])
  if (!selectorNode.nodes[0]) {
    return { kind: undefined, comparator: undefined }
  }

  let kindValue = ''
  let comparator: VulnComparator = undefined
  let kind: VulnKinds

  // Parse the parameter (kind with optional comparator)
  if (isStringNode(selectorNode.nodes[0])) {
    kindValue = removeQuotes(
      asStringNode(selectorNode.nodes[0]).value,
    )
  } else if (isTagNode(selectorNode.nodes[0])) {
    kindValue = asTagNode(selectorNode.nodes[0]).value
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

  // Validate the kind without comparator
  if (!comparator) {
    kind = asVulnKind(kindValue)
  } else {
    // For comparisons, just make sure it's a valid numeric value or a valid kind
    if (isVulnKind(kindValue)) {
      kind = kindValue
    } else {
      throw error(
        'Expected a valid vuln kind or number between 0-3',
        {
          found: kindValue,
        },
      )
    }
  }

  return { kind, comparator }
}

/**
 * :vuln / :vulnerable Pseudo-Selector, matches nodes with vulnerability alerts.
 *
 * Usage:
 * - :vuln - matches vulnerabilities with severity >= medium (critical, high, medium but not low)
 * - :vuln(critical) - matches specific vulnerability kind
 * - :vuln(>1) - matches vulnerabilities with severity greater than 1
 * - :vuln(">=medium") - matches vulnerabilities with severity >= medium
 */
export const vuln = async (state: ParserState) => {
  assertSecurityArchive(state, 'vuln')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :vuln selector', { cause: err })
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
      if (kind === undefined && comparator === undefined) {
        // Parameterless :vuln - match vuln alerts with severity >= medium
        // Includes: criticalCVE, cve, potentialVulnerability, gptSecurity,
        //           and any alert carrying a cveId prop
        // Excludes: mildCVE, gptAnomaly (low severity)
        exclude = !report.alerts.some(alert => {
          const level = getAlertLevel(alert)
          return level != null && level <= 2
        })
      } else if (comparator) {
        // retrieve the value to compare against
        const kindLevel = kindLevelMap.get(kind)
        // the kindLevel value has already been validated at this point
        // and thus can never return an undefined/falsy value but ts doesn't
        // know about that, so we have the extra check here
        /* c8 ignore next - impossible */
        if (kindLevel == null) break

        // Check each alert to find any that match our comparison criteria
        for (const alert of report.alerts) {
          const currentAlertLevel = getAlertLevel(alert)
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

          // If we've found a match, no need to check other alerts
          if (!exclude) break
        }
      } else {
        // Exact match behavior — also matches gptSecurity/gptAnomaly
        // at the same level as their mapped kind, and cveId-bearing alerts
        const targetLevel = kindLevelMap.get(kind)
        exclude = !report.alerts.some(alert => {
          const level = getAlertLevel(alert)
          return level != null && level === targetLevel
        })
      }
    }

    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
