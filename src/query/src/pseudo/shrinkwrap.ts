import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **shrinkwrap** report alert.
 */
export const shrinkwrap = createSecuritySelectorFilter(
  'shrinkwrap',
  'shrinkwrap',
)
