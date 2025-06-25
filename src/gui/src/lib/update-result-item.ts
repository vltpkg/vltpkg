import type React from 'react'
import type {GridItemData} from '@/components/explorer-grid/types.ts';

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
 * Updates the query based on a given result item.
 */
export const updateResultItem =
  ({ item, query, updateQuery }: UpdateResultItemOptions) =>
  (e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    if (!item.to) return
    let newQuery = ''
    const appendToQuery = (s: string) => {
      const q = query.trim()
      return q === s ? q : `${q}${s}`
    }
    if (item.stacked) {
      newQuery = appendToQuery(item.to.name ? `#${item.to.name}` : '')
    } else {
      let suffix = ''
      if (!item.sameItems) {
        suffix = item.to.name ? `#${item.to.name}` : ''
      }
      if (item.to.importer && !item.from) {
        newQuery = `:project#${item.to.name}`
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
        if (query.startsWith(':root')) {
          const queryParts = query.split(' ')
          queryParts.splice(
            queryParts.length - 1,
            0,
            `${fromName}${fromVersion} >`,
          )
          newQuery = queryParts.join(' ')
        } else {
          newQuery = `${fromName}${fromVersion} > ${appendToQuery(suffix)}`
        }
      } else {
        newQuery = appendToQuery(suffix)
      }
    }
    updateQuery(newQuery)
    return undefined
  }
