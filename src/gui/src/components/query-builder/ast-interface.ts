import { toUiTokens } from '@/components/query-builder/ast-tokenize.ts'
import { fromUiTokens } from '@/components/query-builder/ast-stringify.ts'
import type { QueryBuilderToken } from '@/components/query-builder/options.ts'
import type {
  UiNode,
  PseudoUiNode,
} from '@/components/query-builder/ui-node-types.ts'

export const constructUiAst = (query: string): UiNode[] | undefined =>
  toUiTokens(query)

export const constructQuery = (nodes: UiNode[]): string =>
  fromUiTokens(nodes)

/**
 * Creates a UiNode from a QueryBuilderToken
 *
 * For pseudo selectors that need arguments (like :score("<=0.5", "maintenance")),
 * pass them as an array of objects. If no value is provided, it will default
 * to using the token.token property.
 *
 */
export const createNodeFromToken = ({
  token,
  arguments: argumentsArray,
}: {
  token: QueryBuilderToken
  arguments?: { token?: QueryBuilderToken; value?: string }[]
}): UiNode => {
  let node: UiNode

  switch (token.type) {
    case 'string':
      node = {
        type: 'string',
        value: token.token,
      }
      break
    case 'pseudo': {
      const children = argumentsArray?.map(arg => ({
        type: 'string' as const,
        value: arg.value ?? arg.token?.token ?? '',
      }))

      node = {
        type: 'pseudo',
        value: token.token as PseudoUiNode['value'],
        children,
      }
      break
    }
    case 'attribute':
      node = {
        type: 'attribute',
        value: token.token,
        attribute: token.token,
      }
      break
    case 'root':
      node = {
        type: 'root',
        value: token.token,
      }
      break
    case 'id':
      node = {
        type: 'id',
        value: token.token,
      }
      break
    case 'combinator':
      node = {
        type: 'combinator',
        value: token.token,
      }
      break
    case 'tag':
      node = {
        type: 'tag',
        value: token.token,
      }
      break
    default:
      throw new Error(`Unsupported token type: ${token.type}`)
  }

  return node
}
