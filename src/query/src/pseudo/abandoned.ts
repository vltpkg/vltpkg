import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **missingAuthor** report alert.
 */
export const abandoned = createSecuritySelectorFilter(
  'abandoned',
  'missingAuthor',
)
