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
  cancellable: () => Promise<void>
  collect: GraphSelectionState
  current: PostcssNode
  initial: GraphSelectionState
  loose?: boolean
  next?: PostcssNode
  prev?: PostcssNode
  result?: NodeLike[]
  signal?: AbortSignal
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

const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

export const isAttributeNode = (node: unknown): node is Attribute =>
  isObj(node) && !!node.attribute && node.type === 'attribute'

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

export const isClassNode = (node: unknown): node is ClassName =>
  isObj(node) && !!node.value && node.type === 'class'

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

export const isCombinatorNode = (node: unknown): node is Combinator =>
  isObj(node) && !!node.value && node.type === 'combinator'

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
  isObj(node) && !!node.value && node.type === 'id'

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

export const isPseudoNode = (node: unknown): node is Pseudo =>
  isObj(node) && !!node.value && node.type === 'pseudo'

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

export const isTagNode = (node: unknown): node is Tag =>
  isObj(node) && !!node.value && node.type === 'tag'

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
