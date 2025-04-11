import postcssSelectorParser from 'postcss-selector-parser'
import type { Root } from 'postcss-selector-parser'
import { isStringNode } from './types.ts'
import type { PostcssNode } from './types.ts'

/**
 * Escapes forward slashes in specific patterns matching @scoped/name paths
 * This will allow usage of unescaped forward slashes necessary for scoped
 * package names in the id selector.
 */
export const escapeScopedNamesSlashes = (query: string): string =>
  query.replace(/(#@\w+)\//gm, (_, scope: string) => `${scope}\\/`)

export const escapeDots = (query: string): string =>
  query.replaceAll('.', '\\.')

export const unescapeDots = (query: string): string =>
  query.replace(/\\\./gm, '.')

/**
 * Parses a CSS selector string into an AST
 * Handles escaping of forward slashes in specific patterns
 */
export const parse = (query: string): Root => {
  const escapedQuery = escapeDots(escapeScopedNamesSlashes(query))
  const transformAst = (root: Root) => {
    root.walk((node: PostcssNode) => {
      if (isStringNode(node)) {
        node.value = unescapeDots(node.value)
      }
    })
  }
  return postcssSelectorParser(transformAst).astSync(escapedQuery)
}
