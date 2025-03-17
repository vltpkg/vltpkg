import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **manifestConfusion** report alert.
 */
export const confused = createSecuritySelectorFilter(
  'confused',
  'manifestConfusion',
)
