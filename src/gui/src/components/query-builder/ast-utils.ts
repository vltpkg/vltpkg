import {
  selector,
  root,
  attribute as createAttribute,
} from 'postcss-selector-parser'
import type { attribute, pseudo } from 'postcss-selector-parser'
import type { PostCSSLeaf, PostcssNode } from '@vltpkg/dss-parser'

import type { UiNode } from '@/components/query-builder/ui-node-types.ts'

export const toUiNodeFromPostcss = (
  postcssNode: PostcssNode,
): UiNode => {
  const nodeType = postcssNode.type
  return {
    type: nodeType as UiNode['type'],
    value: (postcssNode as { value: string }).value,
  } as UiNode
}

export const createSelector = () => selector({ value: '' })
export const createRoot = () => root({ value: '' })

export const appendToPseudo = (
  p: ReturnType<typeof pseudo>,
  child: PostCSSLeaf | ReturnType<typeof selector>,
) => {
  ;(
    p as unknown as {
      append: (
        node: PostCSSLeaf | ReturnType<typeof selector>,
      ) => void
    }
  ).append(child)
}

export const appendToSelector = (
  s: ReturnType<typeof selector>,
  child: PostCSSLeaf,
) => {
  ;(s as unknown as { append: (node: PostCSSLeaf) => void }).append(
    child,
  )
}

export interface AttributeLeafOptions {
  attribute: string
  value: string
  operator?: string
  insensitive?: boolean
  raws?: unknown
}

export const createAttributeLeaf = (
  opts: AttributeLeafOptions,
): ReturnType<typeof attribute> => {
  // postcss-selector-parser expects a specific options shape that isn't exported.
  // Cast the factory to a compatible signature and pass strongly-typed opts.
  const factory = createAttribute as unknown as (
    o: AttributeLeafOptions,
  ) => ReturnType<typeof attribute>
  return factory(opts)
}
