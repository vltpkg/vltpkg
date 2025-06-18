import {
  isPostcssNodeWithChildren,
  isPseudoNode,
  isIdentifierNode,
  isCombinatorNode,
  isCommentNode,
  isStringNode,
  isTagNode,
  asStringNode,
  asTagNode,
  parse,
  asPostcssNodeWithChildren,
} from '@vltpkg/dss-parser'
import type { PostcssNode } from '@vltpkg/dss-parser'
import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/semver'
import type {
  ModifierBreadcrumb,
  ModifierBreadcrumbItem,
  ModifierInteractiveBreadcrumb,
  BreadcrumbSpecificity,
  ModifierComparatorOptions,
  InternalModifierComparatorOptions,
} from './types.ts'

export * from './types.ts'

/**
 * The returned pseudo selector parameters object.
 */
type ParsedPseudoParameters = {
  semverValue?: string
}

/**
 * The higher level function for pseudo selectors comparators.
 */
type PseudoSelectorsComparatorFn = (
  internal: InternalModifierComparatorOptions,
) => (opts: ModifierComparatorOptions) => boolean

/**
 * A comparator function that always returns true.
 */
const passthroughComparator = () => () => true

/**
 * A comparator function for semver pseudo selectors.
 */
const semverComparator =
  ({ range }: InternalModifierComparatorOptions) =>
  ({ version }: ModifierComparatorOptions) => {
    if (range && version) {
      return satisfies(version, range)
    }
    return false
  }

/**
 * A map of pseudo selectors to their comparator functions.
 */
const pseudoSelectors = new Map<string, PseudoSelectorsComparatorFn>([
  [':semver', semverComparator],
  [':v', semverComparator],
])

/**
 * The subset of importer pseudo selectors that are supported.
 */
const importerNames = new Set([':project', ':workspace', ':root'])

// Add importer pseudo selectors to the list of supported selectors
for (const importerName of importerNames) {
  pseudoSelectors.set(importerName, passthroughComparator)
}

/**
 * Helper function to remove quotes from a string value.
 */
export const removeQuotes = (value: string) =>
  value.replace(/^"(.*?)"$/, '$1')

/**
 * Helper function to extract parameter value from pseudo selector nodes.
 */
export const extractPseudoParameter = (
  item: any,
): ParsedPseudoParameters => {
  if (!isPostcssNodeWithChildren(item) || !item.nodes[0]) {
    return {}
  }

  let first
  try {
    // Try to parse as string node first (quoted values)
    const firstNode = asPostcssNodeWithChildren(item.nodes[0])
      .nodes[0]

    if (isStringNode(firstNode)) {
      first = removeQuotes(firstNode.value)
    }

    // Handle tag node (unquoted values)
    if (isTagNode(firstNode)) {
      first = asTagNode(firstNode).value
    }
  } catch {}

  if (item.value === ':semver' || item.value === ':v') {
    return {
      semverValue: first,
    }
  }

  return {}
}

/**
 * Helper function to get the full text representation
 * of a pseudo selector including parameters
 */
export const getPseudoSelectorFullText = (
  item: PostcssNode,
): string => {
  if (!isPostcssNodeWithChildren(item) || !item.nodes[0]) {
    return item.value || ''
  }

  const baseValue = item.value
  const paramNode = item.nodes[0]

  let paramText = ''

  if (isPostcssNodeWithChildren(paramNode)) {
    // reconstruct the parameter by combining all child nodes
    paramText = paramNode.nodes
      .map(node => {
        if (isStringNode(node)) {
          return asStringNode(node).value
        } else if (isTagNode(node)) {
          return asTagNode(node).value
        } else {
          return node.value
        }
      })
      .join('')
  }

  return `${baseValue}(${paramText})`
}

/**
 * The Breadcrumb class is used to represent a valid breadcrumb
 * path that helps you traverse a graph and find a specific node or edge.
 *
 * Alongside the traditional analogy, "Breadcrumb" is also being used here
 * as a term used to describe the subset of the query language that uses
 * only pseudo selectors, id selectors & combinators.
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

    // iterates only at the first level of the AST since any
    // pseudo selectors that relies on nested nodes are invalid syntax
    for (const item of ast.first.nodes) {
      const pseudoNode = isPseudoNode(item)

      // checks for only supported pseudo selectors
      if (pseudoNode && !pseudoSelectors.has(item.value)) {
        throw error('Invalid pseudo selector', {
          found: item.value,
        })
      }

      const allowedTypes =
        isIdentifierNode(item) ||
        pseudoNode ||
        (isCombinatorNode(item) && item.value === '>') ||
        isCommentNode(item)
      const hasChildren =
        isPostcssNodeWithChildren(item) && item.nodes.length > 0
      const semverNode =
        pseudoNode &&
        (item.value === ':semver' || item.value === ':v')

      // validation, only pseudo selectors, id selectors
      // and combinators are valid ast node items
      // pseudo selectors are allowed to have children (parameters)
      if ((hasChildren && !pseudoNode) || !allowedTypes) {
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

        // Extract parameter before potential consolidation
        const providedRange: string =
          (
            pseudoNode &&
            (item.value === ':semver' || item.value === ':v')
          ) ?
            (extractPseudoParameter(item).semverValue ?? '')
          : ''

        // get the comparator function for a given pseudo selector item
        const internalOptions: InternalModifierComparatorOptions = {
          ...(semverNode ? { range: providedRange } : {}),
        }
        const comparator = (
          pseudoSelectors.get(item.value) ?? passthroughComparator
        )(internalOptions)

        // If we have a previous item and we haven't encountered a combinator
        // since then, consolidate with the previous item
        if (lastItem && !afterCombinator) {
          // Check for invalid chained pseudo selectors
          if (pseudoNode && isPseudoNode(lastItem)) {
            throw error('Invalid query', { found: query })
          }

          // determine how to combine the values based on selector types
          let currentValue: string = item.value
          if (item.type === 'id') {
            currentValue = `#${item.value}`
          } else if (pseudoNode) {
            currentValue = getPseudoSelectorFullText(item)
          }
          lastItem.value = `${lastItem.value}${currentValue}`

          // if current item is an ID, update the name property
          if (isIdentifierNode(item)) {
            lastItem.name = item.value
          }

          // Handle comparator and importer when consolidating with pseudo node
          if (pseudoNode) {
            const lastItemComparator = lastItem.comparator
            lastItem.comparator = (opts: ModifierComparatorOptions) =>
              comparator(opts) && lastItemComparator(opts)
            lastItem.importer ||= importerNames.has(item.value)
          }

          // update specificity counters
          if (isIdentifierNode(item)) {
            this.specificity.idCounter++
          } else if (pseudoNode) {
            this.specificity.commonCounter++
          }

          afterCombinator = false
          continue
        }

        // Create a new breadcrumb item
        let itemValue: string = item.value
        if (item.type === 'id') {
          itemValue = `#${item.value}`
        } else if (pseudoNode) {
          itemValue = getPseudoSelectorFullText(item)
        }

        const newItem = {
          comparator,
          value: itemValue,
          name: item.type === 'id' ? item.value : undefined,
          type: item.type,
          prev: lastItem,
          next: undefined,
          importer: pseudoNode && importerNames.has(item.value),
        }
        if (lastItem) {
          lastItem.next = newItem
        }
        this.#items.push(newItem)

        // Update specificity counters
        if (isIdentifierNode(item)) {
          this.specificity.idCounter++
        } else if (pseudoNode) {
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
