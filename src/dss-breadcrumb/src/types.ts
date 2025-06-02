/**
 * A valid item of a given breadcrumb.
 */
export type ModifierBreadcrumbItem = {
  name?: string
  value: string
  type: string
  importer: boolean
  prev: ModifierBreadcrumbItem | undefined
  next: ModifierBreadcrumbItem | undefined
}

/**
 * A breadcrumb is a linked list of items, where
 * each item has a value and a type.
 */
export interface ModifierBreadcrumb
  extends Iterable<ModifierBreadcrumbItem> {
  clear(): void
  comment: string | undefined
  first: ModifierBreadcrumbItem
  last: ModifierBreadcrumbItem
  single: boolean
  interactive: () => ModifierInteractiveBreadcrumb
}

/**
 * An interactive breadcrumb that holds state on what is the current item.
 */
export type ModifierInteractiveBreadcrumb = {
  current: ModifierBreadcrumbItem | undefined
  done: boolean
  next: () => ModifierInteractiveBreadcrumb
}
