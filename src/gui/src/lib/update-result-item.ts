import type React from 'react'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import { Query } from '@vltpkg/query'
import type { ParsedSelectorToken } from '@vltpkg/query'
import { VIRTUAL_ROOT_ID } from '@vltpkg/graph/browser'

/**
 * Options for updating a result item.
 */
export type UpdateResultItemOptions = {
  /**
   * The item data to update.
   */
  item: GridItemData
  /**
   * The current query string.
   */
  query: string
  /**
   * The zustand-store query update function.
   */
  updateQuery: (query: string) => void
}

/**
 * Appends a string to the query if it is not already present.
 */
const appendToQuery = (query: string, s: string) => {
  const q = query.trim()
  return q === s ? q : `${q}${s}`
}

/**
 * Checks if any segment of the query has an importer token.
 */
const hasImporterToken = (
  queryTokens: ParsedSelectorToken[],
): boolean => {
  for (const segment of queryTokens) {
    if (
      segment.value === ':root' ||
      segment.value === ':workspace' ||
      segment.value === ':project'
    )
      return true
  }
  return false
}

/**
 * Checks if any segment of the query has a :host selector.
 */
const hasHostContextToken = (
  queryTokens: ParsedSelectorToken[],
): boolean => {
  for (const segment of queryTokens) {
    if (segment.value === ':host') {
      return true
    }
  }
  return false
}

/**
 * Returns the trailing character (space or empty string) to be used
 * after a specific token in the query.
 */
const getTrailerChar = (
  queryTokens: ParsedSelectorToken[],
  expectedValue: string,
  expectedToken: string = expectedValue,
) => {
  // iterate on items looking for the expected token values
  return queryTokens.reduce((acc, token, index) => {
    const nextToken = queryTokens[index + 1]
    // if the current token matches the expected value and token type
    // and the next token is a space combinator, then we return a space
    if (
      nextToken &&
      token.type === 'pseudo' &&
      token.value === expectedValue &&
      token.token === expectedToken &&
      nextToken.type === 'combinator' &&
      nextToken.value === ' '
    ) {
      return ' '
    }
    return acc
    // otherwise we return an empty string
  }, '')
}

/**
 * Updates the query based on a given result item.
 */
export const updateResultItem =
  ({ item, query: q, updateQuery }: UpdateResultItemOptions) =>
  (e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    if (!item.to) return
    const query = q.trim()
    let newQuery = query
    // handle :host() selector if present
    const queryTokens = Query.getQueryTokens(query)
    let prefix = ''
    // special handling of :host() token scenarios
    if (hasHostContextToken(queryTokens)) {
      // first of, let's break down the :host() selector and get its key value
      const [, ...rest] = query.split(':host(')
      const [key, ...after] = rest.join('').split(')')
      newQuery = after.join(')')
      let trailer = ''
      // if clicking on any item other than the virtual root itself, let's
      // just make it use the project-specific key (path) so that we can
      // already desimbiguate between projects
      if (item.id !== VIRTUAL_ROOT_ID && item.to.projectRoot) {
        // if the original query was using the descendent (space operator)
        // selector, then let's preserve that info after we change to the
        // project-specific key, the trailer variable here will hold that info
        trailer = getTrailerChar(queryTokens, ':host', ')')
        // in case we're using any importer tokens in the original query,
        // than there are more edge cases we need to handle in order to
        // provide a better dynamic navigation experience
        if (hasImporterToken(queryTokens)) {
          const rootSplit = newQuery.split(':root')
          // also checks for space combinators in order to preserve
          // the descendent selector if it was in use
          trailer = trailer || getTrailerChar(queryTokens, ':root')
          if (rootSplit.length > 1) {
            newQuery = rootSplit.slice(1).join('') + trailer
          }
          const projectSplit = newQuery.split(':project')
          trailer = trailer || getTrailerChar(queryTokens, ':project')
          if (projectSplit.length > 1) {
            newQuery = projectSplit.slice(1).join('')
          }
        }
        prefix = `:host("file:${item.to.projectRoot}")${trailer}`
      } else {
        prefix = `:host(${key}) `
      }
    }
    // if it's a stacked item we make sure we select the unique node so that
    // either we get down to a single item or the user is presented with the
    // list of same items to refine the selection again
    if (item.stacked) {
      newQuery = appendToQuery(
        newQuery,
        `[name="${item.to.name}"]:v(${item.to.version})`,
      )
      // if we're selecting the virtual root then we'll only
      // need the prefix so set newQuery to an empty string here
    } else if (item.id === VIRTUAL_ROOT_ID) {
      newQuery = ''
    } else {
      let suffix = ''
      // if it's not a list of the same items then we only attemp to suffix
      // the query with the regular item name
      if (!item.sameItems) {
        suffix = item.name ? `#${item.name}` : ''
      }
      // the item is root
      if (item.to.mainImporter) {
        newQuery += `:root`
        // the item is a workspace
      } else if (item.to.importer) {
        newQuery = `#${item.to.name}:workspace`
      } else if (item.from) {
        // use version on the parent node if there are multiple nodes in the graph with the same name
        const useVersion =
          [...item.from.graph.nodes.values()].filter(
            n => n.name === item.from?.name,
          ).length > 1
        const fromName = `#${item.from.name}`
        const fromVersion =
          useVersion && item.from.version ?
            `:v(${item.from.version})`
          : ''

        // direct dependency of the root
        if (item.from.mainImporter) {
          newQuery = `:root > #${item.name}`
          // parent isn't importer but not root, so it's a workspace
        } else if (item.from.importer) {
          newQuery = ` #${item.from.name}:workspace > #${item.name}`
          // if the selector has an importer than we append a second part
          // using :is() to be able to narrow down by providing a parent
        } else if (hasImporterToken(queryTokens)) {
          const name = `#${item.name}`
          const dest =
            name !== suffix ?
              `#${appendToQuery(item.name, suffix)}`
            : name
          newQuery = `${newQuery}:is(${fromName}${fromVersion} > ${dest})`
        } else {
          // by default we preppend the parent item to the newQuery
          const start = `${fromName}${fromVersion}`
          if (newQuery.startsWith(start)) {
            newQuery = ` ${appendToQuery(newQuery, suffix)}:v(${item.to.version})`
          } else {
            newQuery = ` ${start} > ${appendToQuery(newQuery, suffix)}`
          }
        }
      } else {
        newQuery = appendToQuery(newQuery, suffix)
      }
    }

    updateQuery((prefix + newQuery).trim())
    return undefined
  }
