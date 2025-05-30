import { error } from '@vltpkg/error-cause'
import {
  parse,
  isPostcssNodeWithChildren,
  isPseudoNode,
  isIdentifierNode,
  isCombinatorNode,
  isCommentNode,
} from '@vltpkg/dss-parser'
import type { PostcssNode } from '@vltpkg/dss-parser'
import type { InteractiveBreadcrumbItem } from './types.ts'

export * from './types.ts'

/**
 * The InteractiveBreadcrumb class is used to represent a valid breadcrumb.
 *
 * "Breadcrumb" is a term used to describe the subset of the query language
 * that uses only root/workspace selectors, id selectors & combinators.
 *
 * It implements an iterable, doubly-linked list of items that can be used
 * to navigate through the breadcrumb.
 *
 * It also validates that each element of the provided query string is
 * valid according to the previous definition of a "breadcrumb".
 */
export class InteractiveBreadcrumb
  implements Iterable<InteractiveBreadcrumbItem>
{
  #current: InteractiveBreadcrumbItem
  #items: InteractiveBreadcrumbItem[]
  comment: string | undefined

  /**
   * Initializes the interactive breadcrumb with a query string.
   */
  constructor(query: string) {
    this.#items = []
    const ast = parse(query)

    // Keep track of the previous AST node for consolidation
    let prevNode: PostcssNode | undefined

    // iterates only at the first level of the AST since
    // any nested nodes are invalid syntax
    for (const item of ast.first.nodes) {
      const isWorkspaceOrProject =
        isPseudoNode(item) &&
        (item.value === ':workspace' || item.value === ':project')

      const allowedPseudoNodes =
        isPseudoNode(item) &&
        (item.value === ':root' ||
          item.value === ':workspace' ||
          item.value === ':project')

      const allowedTypes =
        isIdentifierNode(item) ||
        allowedPseudoNodes ||
        (isCombinatorNode(item) && item.value === '>') ||
        isCommentNode(item)

      // Check if this is a nested selector that's not an allowed pseudo
      const isNestedSelector =
        isPostcssNodeWithChildren(item) &&
        !(allowedPseudoNodes && item.nodes.length === 0)

      // validation, only the root/workspace selectors, id selectors
      // and combinators are valid ast node items
      if (isNestedSelector || !allowedTypes) {
        throw error('Invalid query', { found: item })
      }

      // combinators and comments are skipped
      if (isCombinatorNode(item)) {
        prevNode = undefined
        continue
      } else if (isCommentNode(item)) {
        const cleanComment = item.value
          .replace(/^\/\*/, '')
          .replace(/\*\/$/, '')
          .trim()
        this.comment = cleanComment
        prevNode = undefined
      } else {
        // check if we need to consolidate with previous item
        const isPrevWorkspaceOrProject =
          prevNode &&
          isPseudoNode(prevNode) &&
          (prevNode.value === ':workspace' ||
            prevNode.value === ':project')

        const isPrevId = prevNode && isIdentifierNode(prevNode)
        const isCurrentId = isIdentifierNode(item)
        const lastItem =
          this.#items.length > 0 ?
            this.#items[this.#items.length - 1]
          : null

        // current node is ID, previous was workspace/project
        if (isCurrentId && isPrevWorkspaceOrProject && lastItem) {
          // Modify the last item to include the ID
          lastItem.value = `${lastItem.value}#${item.value}`
          prevNode = undefined
          continue
        }

        // current node is workspace/project, previous was ID
        if (isWorkspaceOrProject && isPrevId && lastItem) {
          // Modify the last item to include the pseudo
          lastItem.value = `${lastItem.value}${item.value}`
          lastItem.importer = true
          prevNode = undefined
          continue
        }

        // Default case: create a new item normally
        const prev = this.#items[this.#items.length - 1]
        const newItem = {
          value: item.value,
          type: item.type,
          prev,
          next: undefined,
          importer: allowedPseudoNodes,
        }
        if (prev) {
          prev.next = newItem
        }
        this.#items.push(newItem)
        prevNode = item
      }
    }
    // the parsed query should have at least one item
    // that is then going to be set as the current item
    if (!this.#items[0]) {
      throw error('Failed to parse query', {
        found: query,
      })
    }
    this.#current = this.#items[0]
  }

  /**
   * The current breadcrumb item.
   */
  get current(): InteractiveBreadcrumbItem {
    return this.#current
  }

  /**
   * The next breadcrumb item.
   */
  next(): InteractiveBreadcrumbItem | undefined {
    if (!this.#current.next) {
      return
    }
    this.#current = this.#current.next
    return this.#current
  }

  /**
   * The previous breadcrumb item.
   */
  prev(): InteractiveBreadcrumbItem | undefined {
    if (!this.#current.prev) {
      return
    }
    this.#current = this.#current.prev
    return this.#current
  }

  [Symbol.iterator]() {
    return this.#items.values()
  }

  /**
   * Empties the current breadcrumb list.
   */
  clear() {
    for (const item of this.#items) {
      item.prev = undefined
      item.next = undefined
    }
    this.#items.length = 0
  }
}

/**
 * Returns an {@link InteractiveBreadcrumb} list of items
 * for a given query string.
 */
export function getBreadcrumb(query: string): InteractiveBreadcrumb {
  return new InteractiveBreadcrumb(query)
}
