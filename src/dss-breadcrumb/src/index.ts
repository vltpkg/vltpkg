import {
  isPostcssNodeWithChildren,
  isPseudoNode,
  isIdentifierNode,
  isCombinatorNode,
  isCommentNode,
  parse,
} from '@vltpkg/dss-parser'
import { error } from '@vltpkg/error-cause'
import type {
  ModifierBreadcrumb,
  ModifierBreadcrumbItem,
  ModifierInteractiveBreadcrumb,
  BreadcrumbSpecificity,
} from './types.ts'

export * from './types.ts'

/**
 * The Breadcrumb class is used to represent a valid breadcrumb
 * path that helps you traverse a graph and find a specific node or edge.
 *
 * Alongside the traditional analogy, "Breadcrumb" is also being used here
 * as a term used to describe the subset of the query language that uses
 * only root/workspace selectors, id selectors & combinators.
 *
 * The Breadcrumb class implements a doubly-linked list of items
 * that can be used to navigate through the breadcrumb.
 * The InteractiveBreadcrumb can also be used to keep track of state
 * of the current breadcrumb item that should be used for checks.
 *
 * It also validates that each element of the provided query string is
 * valid according to the previous definition of a "Breadcrumb" query
 * language subset.
 */
export class Breadcrumb implements ModifierBreadcrumb {
  #items: ModifierBreadcrumbItem[]
  comment: string | undefined
  specificity: BreadcrumbSpecificity

  /**
   * Initializes the interactive breadcrumb with a query string.
   */
  constructor(query: string) {
    this.#items = []
    this.specificity = { idCounter: 0, commonCounter: 0 }
    const ast = parse(query)

    // Track whether we encountered a combinator since the last item
    let afterCombinator = true

    // iterates only at the first level of the AST since
    // any nested nodes are invalid syntax
    for (const item of ast.first.nodes) {
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
        throw error('Invalid query', { found: query })
      }

      // combinators and comments are skipped
      if (isCombinatorNode(item)) {
        afterCombinator = true
        continue
      } else if (isCommentNode(item)) {
        const cleanComment = item.value
          .replace(/^\/\*/, '')
          .replace(/\*\/$/, '')
          .trim()
        this.comment = cleanComment
        afterCombinator = true
      } else {
        // we define the last item as we iterate through the list of
        // breadcrumb items so that this value can also be used to
        // update previous items when needed
        const lastItem =
          this.#items.length > 0 ?
            this.#items[this.#items.length - 1]
          : undefined

        // If we have a previous item and we haven't encountered a combinator
        // since then, consolidate with the previous item
        if (lastItem && !afterCombinator) {
          // Determine how to combine the values based on selector types
          const currentValue =
            item.type === 'id' ? `#${item.value}` : item.value
          lastItem.value = `${lastItem.value}${currentValue}`

          // If current item is an ID, update the name property
          if (isIdentifierNode(item)) {
            lastItem.name = item.value
          }

          // If current item is an importer pseudo, mark the combined item as importer
          if (allowedPseudoNodes) {
            lastItem.importer = true
          }

          // Update specificity counters
          if (isIdentifierNode(item)) {
            this.specificity.idCounter++
          } else if (isPseudoNode(item)) {
            this.specificity.commonCounter++
          }

          afterCombinator = false
          continue
        }

        // Create a new breadcrumb item
        const newItem = {
          value: item.type === 'id' ? `#${item.value}` : item.value,
          name: item.type === 'id' ? item.value : undefined,
          type: item.type,
          prev: lastItem,
          next: undefined,
          importer: allowedPseudoNodes,
        }
        if (lastItem) {
          lastItem.next = newItem
        }
        this.#items.push(newItem)

        // Update specificity counters
        if (isIdentifierNode(item)) {
          this.specificity.idCounter++
        } else if (isPseudoNode(item)) {
          this.specificity.commonCounter++
        }

        afterCombinator = false
      }
    }
    // the parsed query should have at least one item
    // that is then going to be set as the current item
    if (!this.#items[0]) {
      throw error('Failed to parse query', {
        found: query,
      })
    }
  }

  /**
   * Retrieves the first breadcrumb item.
   */
  get first(): ModifierBreadcrumbItem {
    if (!this.#items[0]) {
      throw error('Failed to find first breadcrumb item')
    }
    return this.#items[0]
  }

  /**
   * Retrieves the last breadcrumb item.
   */
  get last(): ModifierBreadcrumbItem {
    const lastItem = this.#items[this.#items.length - 1]
    if (!lastItem) {
      throw error('Failed to find first breadcrumb item')
    }
    return lastItem
  }

  /**
   * Returns `true` if the breadcrumb is composed of a single item.
   */
  get single(): boolean {
    return this.#items.length === 1
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

  /**
   * Gets an {@link InteractiveBreadcrumb} instance that can be
   * used to track state of the current breadcrumb item.
   */
  interactive() {
    return new InteractiveBreadcrumb(this)
  }
}

/**
 * The InteractiveBreadcrumb is used to keep track of state
 * of the current breadcrumb item that should be used for checks.
 */
export class InteractiveBreadcrumb
  implements ModifierInteractiveBreadcrumb
{
  #current: ModifierBreadcrumbItem | undefined
  constructor(breadcrumb: Breadcrumb) {
    this.#current = breadcrumb.first
  }

  /**
   * The current breadcrumb item.
   */
  get current(): ModifierBreadcrumbItem | undefined {
    return this.#current
  }

  /**
   * Returns `true` if the current breadcrumb has no more items left.
   */
  get done(): boolean {
    return !this.#current
  }

  /**
   * The next breadcrumb item.
   */
  next(): this {
    this.#current = this.#current?.next
    return this
  }
}

/**
 * Returns an {@link Breadcrumb} list of items
 * for a given query string.
 */
export const parseBreadcrumb = (query: string): ModifierBreadcrumb =>
  new Breadcrumb(query)

/**
 * Sorts an array of Breadcrumb objects by specificity. Objects with
 * higher idCounter values come first, if idCounter values are equal,
 * then objects with higher commonCounter values come first. Otherwise,
 * the original order is preserved.
 */
export const specificitySort = (
  breadcrumbs: ModifierBreadcrumb[],
): ModifierBreadcrumb[] => {
  return [...breadcrumbs].sort((a, b) => {
    // First compare by idCounter (higher comes first)
    if (a.specificity.idCounter !== b.specificity.idCounter) {
      return b.specificity.idCounter - a.specificity.idCounter
    }

    // If idCounter values are equal, compare by commonCounter
    if (a.specificity.commonCounter !== b.specificity.commonCounter) {
      return b.specificity.commonCounter - a.specificity.commonCounter
    }

    // If both counters are equal, preserve original order
    return 0
  })
}
