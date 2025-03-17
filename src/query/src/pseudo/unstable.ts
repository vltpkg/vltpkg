import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **unstableOwnership** report alert.
 */
export const unstable = createSecuritySelectorFilter(
  'unstable',
  'unstableOwnership',
)
