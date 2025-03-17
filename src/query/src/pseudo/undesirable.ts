import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **troll** report alert.
 */
export const undesirable = createSecuritySelectorFilter(
  'undesirable',
  'troll',
)
