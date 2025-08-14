import { PROJECT_SELECTORS } from '@/components/query-builder/options.ts'
import {
  PSEUDO_FUNCTIONAL_CLASSES,
  PSEUDO_RELATIONSHIP_SELECTORS,
  PSEUDO_ATTRIBUTE_SELECTOR,
  PSEUDO_STATE_SELECTORS,
  PSEUDO_SECURITY_SELECTORS,
} from '@/lib/constants/selectors.ts'

import type { Combinator } from '@/lib/constants/selectors.ts'
import type {
  AttributeUiNode,
  PseudoUiNode,
  UiNode,
} from '@/components/query-builder/ui-node-types.ts'

export const isStringUiNode = (node: UiNode): node is UiNode => {
  return node.type === 'string'
}

export const isPseudoUiNode = (
  node: UiNode,
): node is PseudoUiNode => {
  return node.type === 'pseudo'
}

export const isProjectUiNode = (
  node: UiNode,
): node is PseudoUiNode => {
  return (
    node.type === 'pseudo' &&
    PROJECT_SELECTORS.includes(
      node.value as keyof (typeof PROJECT_SELECTORS)[keyof typeof PROJECT_SELECTORS],
    )
  )
}

export const isStatePseudo = (
  node: UiNode,
): node is PseudoUiNode & {
  value: keyof typeof PSEUDO_STATE_SELECTORS
} => {
  return (
    node.type === 'pseudo' &&
    Object.keys(PSEUDO_STATE_SELECTORS).includes(node.value)
  )
}

export const isSecurityPseudo = (
  node: UiNode,
): node is PseudoUiNode & {
  value: keyof typeof PSEUDO_SECURITY_SELECTORS
} => {
  return (
    node.type === 'pseudo' &&
    Object.keys(PSEUDO_SECURITY_SELECTORS).includes(node.value)
  )
}

export const isRelationshipPseudo = (
  node: PseudoUiNode,
): node is PseudoUiNode & {
  value: keyof typeof PSEUDO_RELATIONSHIP_SELECTORS
} => {
  return Object.keys(PSEUDO_RELATIONSHIP_SELECTORS).includes(
    node.value,
  )
}

export const isFunctionalPseudo = (
  node: PseudoUiNode,
): node is PseudoUiNode & {
  value: keyof typeof PSEUDO_FUNCTIONAL_CLASSES
  children?: UiNode[]
} => {
  return (
    Array.isArray(node.children) &&
    node.children.length > 0 &&
    Object.keys(PSEUDO_FUNCTIONAL_CLASSES).includes(node.value)
  )
}

export const isAttributeUiNode = (
  node: UiNode,
): node is AttributeUiNode => {
  return node.type === 'attribute'
}

export const isAttributePseudo = (
  node: PseudoUiNode,
): node is PseudoUiNode & {
  value: keyof typeof PSEUDO_ATTRIBUTE_SELECTOR
  children?: UiNode[]
} => {
  return Object.keys(PSEUDO_ATTRIBUTE_SELECTOR).includes(node.value)
}

export const isCombinatorUiNode = (
  node: UiNode,
): node is UiNode & { value: Combinator } => {
  return (
    node.type === 'combinator' &&
    ['>', '~', ' '].includes(node.value as Combinator)
  )
}

export const isCommaUiNode = (
  node: UiNode,
): node is UiNode & { type: 'comma'; value: ',' } => {
  return node.type === 'comma'
}

export const isIdentifierUiNode = (
  node: UiNode,
): node is UiNode & { value: string } => {
  return (
    node.type === 'id' &&
    typeof node.value === 'string' &&
    node.value.length > 0
  )
}

export const isTagUiNode = (
  node: UiNode,
): node is UiNode & { value: string } => {
  return (
    node.type === 'tag' &&
    typeof node.value === 'string' &&
    node.value.length > 0
  )
}
