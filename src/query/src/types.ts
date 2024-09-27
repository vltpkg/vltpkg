import { error } from '@vltpkg/error-cause'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import type {
  Tag,
  String,
  Selector,
  Root,
  Pseudo,
  Nesting,
  Identifier,
  Comment,
  Combinator,
  ClassName,
  Attribute,
  Universal,
} from 'postcss-selector-parser'

export type PostcssNode =
  | Tag
  | String
  | Selector
  | Root
  | Pseudo
  | Nesting
  | Identifier
  | Comment
  | Combinator
  | ClassName
  | Attribute
  | Universal

export type PostcssNodeWithChildren = Selector | Root | Pseudo

export type GraphSelectionState = {
  nodes: Set<NodeLike>
  edges: Set<EdgeLike>
}

export type ParserState = {
  collect: GraphSelectionState
  current: PostcssNode
  initial: GraphSelectionState
  loose?: boolean
  next?: PostcssNode
  prev?: PostcssNode
  result?: NodeLike[]
  walk: ParserFn
  partial: GraphSelectionState
}

export type QueryResponse = {
  edges: EdgeLike[]
  nodes: NodeLike[]
}

export type ParserFn = (opt: ParserState) => Promise<ParserState>

export const isPostcssNodeWithChildren = (
  node: any,
): node is PostcssNodeWithChildren =>
  'type' in node && 'nodes' in node

export const asPostcssNodeWithChildren = (
  node?: PostcssNode,
): PostcssNodeWithChildren => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isPostcssNodeWithChildren(node)) {
    throw error('Not a query selector node with children', {
      found: node,
    })
  }
  return node
}

export const isAttributeNode = (node: any): node is Attribute =>
  node.attribute && node.type === 'attribute'

export const asAttributeNode = (node?: PostcssNode): Attribute => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isAttributeNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'attribute',
      found: node.type,
    })
  }
  return node
}

export const isClassNode = (node: any): node is ClassName =>
  node.value && node.type === 'class'

export const asClassNode = (node?: PostcssNode): ClassName => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isClassNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'class',
      found: node.type,
    })
  }
  return node
}

export const isCombinatorNode = (node: any): node is Combinator =>
  node.value && node.type === 'combinator'

export const asCombinatorNode = (node?: PostcssNode): Combinator => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isCombinatorNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'combinator',
      found: node.type,
    })
  }
  return node
}

export const isIdentifierNode = (node: any): node is Identifier =>
  node.value && node.type === 'id'

export const asIdentifierNode = (node?: PostcssNode): Identifier => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isIdentifierNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'id',
      found: node.type,
    })
  }
  return node
}

export const isSelectorNode = (node: any): node is Selector =>
  isPostcssNodeWithChildren(node) && node.type === 'selector'

export const isPseudoNode = (node: any): node is Pseudo =>
  node.value && node.type === 'pseudo'

export const asPseudoNode = (node?: PostcssNode): Pseudo => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isPseudoNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'pseudo',
      found: node.type,
    })
  }
  return node
}

export const isTagNode = (node: any): node is Tag =>
  node.value && node.type === 'tag'

export const asTagNode = (node?: PostcssNode): Tag => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isTagNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'tag',
      found: node.type,
    })
  }

  return node
}
