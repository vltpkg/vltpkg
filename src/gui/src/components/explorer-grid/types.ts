import type { QueryResponseEdge } from '@vltpkg/query'

/**
 * A looser representation of an edge, it contains optional properties that
 * are meant to be used alongside importer nodes where they might be missing.
 */
export type EdgeLoose = Pick<QueryResponseEdge, 'name'> & {
  type?: QueryResponseEdge['type']
  spec?: QueryResponseEdge['spec']
  from?: QueryResponseEdge['from']
  to?: QueryResponseEdge['to']
}

/**
 * Data to be presented in the UI in the form of Cards. This is used for
 * both the main result column, selected node and side panel views.
 */
export type GridItemData = EdgeLoose & {
  /**
   * The original dependency name as defined in its parent manifest.
   */
  depName?: string
  /**
   * An index value shared between installed and uninstalled dependencies
   * to keep track of the order they were added to the UI.
   */
  depIndex?: number
  /**
   * A unique identifier for the item. This will not translate to `node.to.id`
   * but rather concatenate names / ids to create a unique id per item.
   * Used as the unique `key` for React components.
   */
  id: string
  /**
   * Whether the current result interface is showing only results for a single
   * node. Used for dynamically building queries when clicking the UI.
   */
  sameItems?: boolean
  /**
   * How many resulting edges this item represents.
   */
  size: number
  /**
   * Whether this item is representing multiple edge results.
   */
  stacked: boolean
  /**
   * A title to be displayed in the Card UI.
   */
  title: string
  /**
   * A version to be used in the UI.
   */
  version: string
  /**
   * A list of labels to be displayed in the Card UI.
   */
  labels?: string[]
}

/**
 * Options used to create new Card grid items to be displayed in the UI.
 */
export type GridItemOptions = {
  item: GridItemData
  dependencies?: boolean
  highlight?: boolean
  selected?: boolean
  side?: boolean
}
