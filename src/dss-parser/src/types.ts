import { error } from '@vltpkg/error-cause'
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
  tag,
  id,
  combinator,
  string,
  attribute,
  pseudo,
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

export type PostCSSLeaf =
  | ReturnType<typeof tag>
  | ReturnType<typeof id>
  | ReturnType<typeof attribute>
  | ReturnType<typeof combinator>
  | ReturnType<typeof pseudo>
  | ReturnType<typeof string>

export type PostcssNodeWithChildren = Selector | Root | Pseudo

export type ParsedSelectorToken = PostcssNode & {
  token: string
}

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

export const asSelectorNode = (node?: PostcssNode): Selector => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isSelectorNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'selector',
      found: node.type,
    })
  }
  return node
}

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

export const isStringNode = (node: unknown): node is String =>
  isObj(node) && !!node.value && node.type === 'string'

export const asStringNode = (node?: PostcssNode): String => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isStringNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'string',
      found: node.type,
    })
  }

  return node
}

export const isCommentNode = (node: unknown): node is Comment =>
  isObj(node) && !!node.value && node.type === 'comment'

export const asCommentNode = (node?: PostcssNode): Comment => {
  if (!node) {
    throw error('Expected a query node')
  }

  if (!isCommentNode(node)) {
    throw error('Mismatching query node', {
      wanted: 'comment',
      found: node.type,
    })
  }

  return node
}
