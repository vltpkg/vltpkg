import postcssSelectorParser from 'postcss-selector-parser'
import type { Root } from 'postcss-selector-parser'

/**
 * Escapes forward slashes in specific patterns matching @scoped/name paths
 * This will allow usage of unescaped forward slashes necessary for scoped
 * package names in the id selector.
 */
export const escapeScopedNamesSlashes = (query: string): string =>
  query.replace(/(#@\w+)\//gm, (_, scope: string) => `${scope}\\/`)

/**
 * Parses a CSS selector string into an AST
 * Handles escaping of forward slashes in specific patterns
 */
export const parse = (query: string): Root => {
  const escapedQuery = escapeScopedNamesSlashes(query)
  return postcssSelectorParser().astSync(escapedQuery)
}
