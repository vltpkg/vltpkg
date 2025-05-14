import {
  satisfies,
  gt,
  gte,
  lt,
  lte,
  eq,
  neq,
  parse,
  parseRange,
} from '@vltpkg/semver'
import type { Version } from '@vltpkg/semver'
import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import { parseInternals as parseAttrInternals } from './attr.ts'
import type { AttrInternals } from './attr.ts'
import { getManifestPropertyValues } from '../attribute.ts'
import {
  asAttributeNode,
  asPostcssNodeWithChildren,
  asPseudoNode,
  asStringNode,
  asTagNode,
  isAttributeNode,
  isPseudoNode,
  isStringNode,
  isTagNode,
} from '../types.ts'
import type { ParserState, PostcssNode } from '../types.ts'
import { removeNode, removeQuotes } from './helpers.ts'

export type SemverInternals = {
  semverValue: string
  semverFunction: SemverComparatorFn
  compareAttribute: SemverCompareAttribute
}

export type SemverFunctionNames =
  | 'satisfies'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'neq'
export type SemverComparatorFn = (
  version: Version | string,
  range: string,
) => boolean
export type SemverCompareAttribute =
  | Pick<AttrInternals, 'attribute' | 'properties'>
  | undefined

const semverFunctionNames = new Set([
  'satisfies',
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
])
export const isSemverFunctionName = (
  name: string,
): name is SemverFunctionNames => semverFunctionNames.has(name)

export const asSemverFunctionName = (
  name: string,
): SemverFunctionNames => {
  if (!isSemverFunctionName(name)) {
    throw error('Invalid semver function name', {
      found: name,
      validOptions: Array.from(semverFunctionNames),
    })
  }
  return name
}

const semverFunctions = new Map<
  SemverFunctionNames,
  SemverComparatorFn
>([
  ['satisfies', satisfies],
  ['gt', gt],
  ['gte', gte],
  ['lt', lt],
  ['lte', lte],
  ['eq', eq],
  ['neq', neq],
])

export const parseInternals = (
  nodes: PostcssNode[],
  loose: boolean,
): SemverInternals => {
  // tries to parse the first param as a string node, otherwise defaults
  // to reading all postcss nodes as just strings, since it just means
  // the value was defined as an unquoted string
  let semverValue = ''
  try {
    semverValue = removeQuotes(
      asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
        .value,
    )
  } catch (err) {
    if (
      asError(err).message === 'Mismatching query node' &&
      isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
    ) {
      // Handle tag node (unquoted values like >=2.0.0)
      const tagNode = asTagNode(
        asPostcssNodeWithChildren(nodes[0]).nodes[0],
      )
      semverValue = tagNode.value
    } else {
      throw err
    }
  }

  // second param is the function name
  let fnName: SemverFunctionNames = 'satisfies'
  try {
    // if there is a second node defined, try to parse it as a string node
    // first and if that fails, then parse it as a tag node which just means
    // it was defined as an unquoted string
    if (nodes[1]) {
      try {
        fnName = asSemverFunctionName(
          removeQuotes(
            asStringNode(asPostcssNodeWithChildren(nodes[1]).nodes[0])
              .value,
          ),
        )
      } catch (err) {
        if (asError(err).message === 'Mismatching query node') {
          fnName = asSemverFunctionName(
            asTagNode(asPostcssNodeWithChildren(nodes[1]).nodes[0])
              .value,
          )
        } else {
          throw err
        }
      }
    }
  } catch (e) {
    // allow invalid semver function names in loose mode, defaults to satisfies
    if (!loose) {
      throw e
    }
  }

  const semverFunction = semverFunctions.get(fnName)
  // the following should never happen as long as the semver function names
  // type and Set are correctly mirroring each other values
  /* c8 ignore start */
  if (!semverFunction) {
    throw error('Invalid semver function name', {
      found: fnName,
      validOptions: Array.from(semverFunctions.keys()),
    })
  }
  /* c8 ignore stop */

  // optional third param is the compare value
  let compareAttribute: SemverCompareAttribute
  if (nodes[2]) {
    const parentNode = asPostcssNodeWithChildren(nodes[2])
    const currNode = parentNode.nodes[0]
    if (isAttributeNode(currNode)) {
      const { attribute } = asAttributeNode(currNode)
      compareAttribute = {
        attribute,
        properties: [attribute],
      }
    } else if (isPseudoNode(currNode)) {
      compareAttribute = parseAttrInternals(
        asPseudoNode(currNode).nodes,
      )
    } else if (isStringNode(currNode)) {
      const attribute = removeQuotes(asStringNode(currNode).value)
      compareAttribute = {
        attribute,
        properties: [attribute],
      }
    }
  }

  return {
    semverValue,
    semverFunction,
    compareAttribute,
  }
}

export const semverParser = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
      !!state.loose,
    )
  } catch (err) {
    throw error('Failed to parse :semver selector', {
      cause: err,
    })
  }

  const { semverValue, semverFunction, compareAttribute } = internals

  for (const node of state.partial.nodes) {
    if (compareAttribute) {
      const compareValues = getManifestPropertyValues(
        node,
        compareAttribute.properties,
        compareAttribute.attribute,
      )

      // if the provided semver value is a fixed semver version and the
      // compare attribute is resolving to a range value, then we flip the
      // order of comparison, in case it's a "satisfies" function check
      const compareValue = compareValues?.[0]
      const semverValueVersion = parse(semverValue)
      const compareValueRange =
        compareValue && parseRange(compareValue)
      if (
        semverFunction === satisfies &&
        semverValueVersion &&
        compareValueRange
      ) {
        if (!satisfies(semverValueVersion, compareValueRange)) {
          removeNode(state, node)
        }
        // otherwise just compares the read attribute to the semver value
      } else if (
        !compareValue ||
        !semverFunction(compareValue, semverValue)
      ) {
        removeNode(state, node)
      }
    } else {
      const manifestVersion = node.manifest?.version
      if (
        !manifestVersion ||
        !semverFunction(manifestVersion, semverValue)
      ) {
        removeNode(state, node)
      }
    }
  }

  return state
}
