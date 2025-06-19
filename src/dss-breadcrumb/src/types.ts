/**
 * The specificity of a breadcrumb, used for sorting.
 */
export type BreadcrumbSpecificity = {
  idCounter: number
  commonCounter: number
}

/**
 * Options for the higher-level comparing breadcrumbs function.
 */
export type InternalModifierComparatorOptions = {
  range?: string
}

/**
 * Options for comparing breadcrumbs.
 */
export type ModifierComparatorOptions = {
  semver?: string
}

/**
 * A valid item of a given breadcrumb.
 */
export type ModifierBreadcrumbItem = {
  comparator: (opts: ModifierComparatorOptions) => boolean
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
  specificity: BreadcrumbSpecificity
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
