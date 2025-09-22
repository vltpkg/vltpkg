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

export type LicenseKinds =
  | 'unlicensed'
  | 'misc'
  | 'restricted'
  | 'ambiguous'
  | 'copyleft'
  | 'unknown'
  | 'none'
  | 'exception'
  | undefined

export type LicenseAlertTypes =
  | 'explicitlyUnlicensedItem'
  | 'miscLicenseIssues'
  | 'nonpermissiveLicense'
  | 'ambiguousClassifier'
  | 'copyleftLicense'
  | 'unidentifiedLicense'
  | 'noLicenseFound'
  | 'licenseException'
  | undefined

const kindsMap = new Map<LicenseKinds, LicenseAlertTypes>([
  ['unlicensed', 'explicitlyUnlicensedItem'],
  ['misc', 'miscLicenseIssues'],
  ['restricted', 'nonpermissiveLicense'],
  ['ambiguous', 'ambiguousClassifier'],
  ['copyleft', 'copyleftLicense'],
  ['unknown', 'unidentifiedLicense'],
  ['none', 'noLicenseFound'],
  ['exception', 'licenseException'],
  [undefined, undefined],
])
const kinds = new Set(kindsMap.keys())

export const isLicenseKind = (
  value?: string,
): value is LicenseKinds => kinds.has(value as LicenseKinds)

export const asLicenseKind = (value?: string): LicenseKinds => {
  if (!isLicenseKind(value)) {
    throw error('Expected a valid license kind', {
      found: value,
      validOptions: Array.from(kinds),
    })
  }
  return value
}

export const parseInternals = (
  nodes: PostcssNode[],
): { kind: LicenseKinds } => {
  let kind: LicenseKinds

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    kind = asLicenseKind(
      removeQuotes(
        asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
          .value,
      ),
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    kind = asLicenseKind(
      asTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0]).value,
    )
  }

  return { kind }
}

export const license = async (state: ParserState) => {
  assertSecurityArchive(state, 'license')

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    if (asError(err).message === 'Expected a query node') {
      // No parameters provided - pseudo state form: match ANY license defined (not 'none')
      for (const node of state.partial.nodes) {
        const report = state.securityArchive.get(node.id)
        // Exclude if no report or if it has 'noLicenseFound' alert
        const exclude =
          !report?.alerts ||
          report.alerts.some(alert => alert.type === 'noLicenseFound')
        if (exclude) {
          removeNode(state, node)
        }
      }
      removeDanglingEdges(state)
      return state
    } else {
      throw error('Failed to parse :license selector', { cause: err })
    }
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

  removeDanglingEdges(state)

  return state
}
