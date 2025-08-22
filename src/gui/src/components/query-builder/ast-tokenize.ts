import { parse, isPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import type { PostcssNode } from '@vltpkg/dss-parser'

import type {
  UiNode,
  AttributeUiNode,
  PseudoUiNode,
} from '@/components/query-builder/ui-node-types.ts'
import type { AttributeFlag } from '@/lib/constants/selectors.ts'

import { toUiNodeFromPostcss } from './ast-utils.ts'

// Convert parser AST into a flat UiNode token stream, inserting 'comma' tokens
// between adjacent selector containers and preserving empty pseudos.
export const toUiTokens = (query: string): UiNode[] | undefined => {
  const root = parse(query)
  const converted = convertNode(root)
  if (!converted) return undefined

  let tokens = flattenRoot(converted)
  tokens = appendDraftSuffixTokens(query, tokens)
  return tokens
}

const convertNode = (
  postcssNode: PostcssNode,
): UiNode | undefined => {
  const children = processChildren(postcssNode)

  if (isAttributeNode(postcssNode)) {
    return createAttributeNode(postcssNode)
  }

  if (children.length > 0) {
    return createContainerNode(postcssNode, children)
  }

  return toUiNodeFromPostcss(postcssNode)
}

const processChildren = (postcssNode: PostcssNode): UiNode[] => {
  if (
    !isPostcssNodeWithChildren(postcssNode) ||
    postcssNode.nodes.length === 0
  ) {
    return []
  }

  const out: UiNode[] = []

  for (let i = 0; i < postcssNode.nodes.length; i++) {
    const child = postcssNode.nodes[i]
    if (!child) continue
    const converted = convertNode(child)
    if (!converted) continue

    if (shouldFlatten(converted)) {
      const nestedChildren = getChildren(converted)
      if (nestedChildren) {
        out.push(...nestedChildren)
        const next = postcssNode.nodes[i + 1]
        if (
          child.type === 'selector' &&
          next &&
          (next as unknown as { type?: string }).type === 'selector'
        ) {
          out.push({ type: 'comma', value: ',' })
        }
        continue
      }
    }

    out.push(converted)
  }
  return out
}

const shouldFlatten = (node: UiNode): boolean => {
  return (
    (node.type === 'selector' || node.type === 'root') &&
    (!node.value || node.value === '')
  )
}

const getChildren = (node: UiNode): UiNode[] | undefined => {
  return 'children' in node ? node.children : undefined
}

const isAttributeNode = (postcssNode: PostcssNode): boolean => {
  return 'operator' in postcssNode || 'flag' in postcssNode
}

const isAttributeFlag = (f: unknown): f is AttributeFlag =>
  f === 'i' || f === 's'

const createAttributeNode = (
  postcssNode: PostcssNode,
): AttributeUiNode => {
  const node: AttributeUiNode = {
    type: 'attribute',
    value: postcssNode.value || '',
    attribute:
      'attribute' in postcssNode ? postcssNode.attribute || '' : '',
  }

  if (
    'operator' in postcssNode &&
    postcssNode.operator !== undefined
  ) {
    node.operator = postcssNode.operator
  }
  if (
    'flag' in postcssNode &&
    isAttributeFlag((postcssNode as { flag?: unknown }).flag)
  ) {
    node.flag = (postcssNode as { flag?: AttributeFlag }).flag
  }
  return node
}

const createContainerNode = (
  postcssNode: PostcssNode,
  children: UiNode[],
): UiNode => {
  if (postcssNode.type === 'pseudo') {
    return {
      type: 'pseudo',
      value: (postcssNode as { value: string })
        .value as PseudoUiNode['value'],
      children,
    }
  }
  return {
    type: postcssNode.type,
    value: (postcssNode as { value?: string }).value || '',
    children,
  } as UiNode
}

// Flatten root (selector-list) and insert comma tokens between adjacent selectors
const flattenRoot = (rootNode: UiNode): UiNode[] | undefined => {
  if (
    rootNode.type === 'root' &&
    'children' in rootNode &&
    Array.isArray(rootNode.children)
  ) {
    const flat: UiNode[] = []
    const kids = rootNode.children as UiNode[]
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i]
      if (
        child &&
        child.type === 'selector' &&
        'children' in child &&
        Array.isArray(child.children)
      ) {
        flat.push(...(child.children as UiNode[]))
        const next = kids[i + 1]
        if (next && next.type === 'selector') {
          flat.push({ type: 'comma', value: ',' })
        }
      } else if (
        child &&
        child.type === 'selector' &&
        (!child.value || child.value === '')
      ) {
        continue
      } else if (child) {
        flat.push(child)
      }
    }
    return flat.length > 0 ? flat : undefined
  }

  if (
    rootNode.type === 'root' &&
    (!rootNode.value || rootNode.value === '')
  ) {
    return undefined
  }
  return [rootNode]
}

// Preserve trailing draft tokens while typing (comma and descendant space)
const appendDraftSuffixTokens = (
  query: string,
  tokens: UiNode[] | undefined,
): UiNode[] | undefined => {
  if (!tokens) return tokens
  let result = tokens

  // Check if query ends with comma but last token isn't a comma
  if (
    query.endsWith(',') &&
    result[result.length - 1]?.type !== 'comma'
  ) {
    result = [...result, { type: 'comma', value: ',' }]
  }

  // Check if query ends with space but last token isn't a space combinator
  // Only add space combinator if the trimmed query doesn't end with other combinators
  const endsWithSpace = /\s$/.test(query)
  const trimmedQuery = query.trimEnd()
  const endsWithOtherCombinator = /[>,~]$/.test(trimmedQuery)
  const lastTokenIsSpaceCombinator =
    result[result.length - 1]?.type === 'combinator' &&
    (result[result.length - 1] as UiNode & { value?: string })
      .value === ' '

  if (
    endsWithSpace &&
    !endsWithOtherCombinator &&
    !lastTokenIsSpaceCombinator
  ) {
    result = [...result, { type: 'combinator', value: ' ' }]
  }

  return result
}
