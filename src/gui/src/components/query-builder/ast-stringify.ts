import {
  tag,
  id,
  combinator,
  pseudo,
  string,
} from 'postcss-selector-parser'

import type { UiNode } from '@/components/query-builder/ui-node-types.ts'
import {
  appendToPseudo,
  appendToSelector,
  createRoot,
  createSelector,
  createAttributeLeaf,
} from '@/components/query-builder/ast-utils.ts'

interface AttributeOptions {
  attribute: string
  value: string
  operator?: string
  insensitive?: boolean
  raws: any
}

interface CombinatorOptions {
  value: string
  spaces?: { before?: string; after?: string }
}

export const fromUiTokens = (nodes: UiNode[]): string => {
  const rootNode = createRoot()
  let currentSelector = createSelector()

  const flushSelector = () => {
    const anySelector = currentSelector as unknown as {
      nodes?: unknown[]
    }
    if (anySelector.nodes && anySelector.nodes.length > 0) {
      ;(rootNode as unknown as { append: (n: any) => void }).append(
        currentSelector,
      )
      currentSelector = createSelector()
    }
  }

  for (const node of nodes) {
    if (node.type === 'comma') {
      flushSelector()
      continue
    }
    const leaf = toPostcssLeaf(node)
    if (leaf) {
      appendToSelector(currentSelector, leaf)
    }
  }

  flushSelector()

  const base = (
    rootNode as unknown as { toString: () => string }
  ).toString()
  const hasTrailingComma = nodes[nodes.length - 1]?.type === 'comma'
  return hasTrailingComma ? `${base},` : base
}

const toPostcssLeaf = (node: UiNode) => {
  switch (node.type) {
    case 'comma':
      return null
    case 'string':
      return string({ value: node.value })
    case 'pseudo': {
      const p = pseudo({ value: node.value })
      if ('children' in node && node.children) {
        const hasComma = node.children.some(c => c.type === 'comma')

        if (!hasComma) {
          for (const child of node.children) {
            const childNode = toPostcssLeaf(child)
            if (childNode) appendToPseudo(p, childNode)
          }
        } else {
          let nestedSel = createSelector()
          const flushNested = () => {
            const any = nestedSel as unknown as { nodes?: unknown[] }
            if (any.nodes && any.nodes.length > 0) {
              appendToPseudo(p, nestedSel)
              nestedSel = createSelector()
            }
          }
          for (const child of node.children) {
            if (child.type === 'comma') {
              flushNested()
              continue
            }
            const leaf = toPostcssLeaf(child)
            if (leaf) appendToSelector(nestedSel, leaf)
          }
          flushNested()
        }
      }
      return p
    }
    case 'attribute': {
      const attr = node as UiNode & {
        attribute: string
        operator?: string
        flag?: string
      }
      const opts: AttributeOptions = {
        attribute: attr.attribute,
        value: node.value,
        raws: {},
      }
      if (attr.operator) {
        opts.operator = attr.operator
      }
      if (attr.flag) {
        opts.insensitive = attr.flag === 'i'
      }
      return createAttributeLeaf(opts)
    }
    case 'id':
      return id({ value: node.value })
    case 'combinator': {
      if (node.value === ' ') return combinator({ value: ' ' })
      const options: CombinatorOptions = {
        value: node.value,
        spaces: { before: ' ', after: ' ' },
      }
      return combinator(options)
    }
    case 'tag':
      return tag({ value: node.value })
    case 'selector':
    case 'root':
      return null
  }
}
