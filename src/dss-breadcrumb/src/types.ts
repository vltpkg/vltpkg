/**
 * A valid item of a given breadcrumb.
 */
export type InteractiveBreadcrumbItem = {
  value: string
  type: string
  prev: InteractiveBreadcrumbItem | undefined
  next: InteractiveBreadcrumbItem | undefined
  importer: boolean
}
