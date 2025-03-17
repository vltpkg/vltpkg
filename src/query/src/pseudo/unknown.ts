import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **newAuthor** report alert.
 */
export const unknown = createSecuritySelectorFilter(
  'unknown',
  'newAuthor',
)
