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

export type SquatKinds = '0' | '2' | 'critical' | 'medium' | undefined

export type SquatAlertTypes =
  | 'didYouMean'
  | 'gptDidYouMean'
  | undefined

const kindsMap = new Map<SquatKinds, SquatAlertTypes>([
  ['critical', 'didYouMean'],
  ['medium', 'gptDidYouMean'],
  ['0', 'didYouMean'],
  ['2', 'gptDidYouMean'],
  [undefined, undefined],
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
): { kind: SquatKinds } => {
  let kind: SquatKinds

  if (isStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])) {
    kind = asSquatKind(
      removeQuotes(
        asStringNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
          .value,
      ),
    )
  } else if (
    isTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0])
  ) {
    kind = asSquatKind(
      asTagNode(asPostcssNodeWithChildren(nodes[0]).nodes[0]).value,
    )
  }

  return { kind }
}

export const squat = async (state: ParserState) => {
  if (!state.securityArchive) {
    throw new Error(
      'Missing security archive while trying to parse ' +
        'the :squat security selector',
    )
  }

  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :squat selector', { cause: err })
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
