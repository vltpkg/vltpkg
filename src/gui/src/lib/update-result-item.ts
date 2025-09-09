import type React from 'react'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import { Query } from '@vltpkg/query'
import type { ParsedSelectorToken } from '@vltpkg/query'

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
    return (
      segment.value === ':root' ||
      segment.value === ':workspace' ||
      segment.value === ':project'
    )
  }
  return false
}

/**
 * Checks if any segment of the query has a :host-context selector.
 */
const hasHostContextToken = (
  queryTokens: ParsedSelectorToken[],
): boolean => {
  for (const segment of queryTokens) {
    if (segment.value === ':host-context') {
      return true
    }
  }
  return false
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
    // handle :host-context() selector if present
    const queryTokens = Query.getQueryTokens(query)
    let prefix = ''
    if (hasHostContextToken(queryTokens)) {
      const [, ...rest] = query.split(':host-context(')
      const [key, ...after] = rest.join('').split(')')
      newQuery = after.join(')')
      prefix = `:host-context(${key}) `
    }
    // if it's a stacked item we make sure we select the unique node so that
    // either we get down to a single item or the user is presented with the
    // list of same items to refine the selection again
    if (item.stacked) {
      newQuery = appendToQuery(
        newQuery,
        `[name="${item.to.name}"]:v(${item.to.version})`,
      )
    } else {
      let suffix = ''
      // if it's not a list of the same items then we only attemp to suffix
      // the query with the regular item name
      if (!item.sameItems) {
        suffix = item.name ? `#${item.name}` : ''
      }
      // the item is root
      if (item.to.mainImporter) {
        if (prefix) {
          newQuery = `#${item.to.name}`
        }
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
          newQuery = `#${item.from.name}:workspace > #${item.name}`
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
            newQuery = `${appendToQuery(newQuery, suffix)}:v(${item.to.version})`
          } else {
            newQuery = `${start} > ${appendToQuery(newQuery, suffix)}`
          }
        }
      } else {
        newQuery = appendToQuery(newQuery, suffix)
      }
    }

    updateQuery(prefix + newQuery)
    return undefined
  }
