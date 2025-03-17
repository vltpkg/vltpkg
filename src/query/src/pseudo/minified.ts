import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **minifiedFile** report alert.
 */
export const minified = createSecuritySelectorFilter(
  'minified',
  'minifiedFile',
)
