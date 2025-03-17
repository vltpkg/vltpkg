import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **highEntropyStrings** report alert.
 */
export const entropic = createSecuritySelectorFilter(
  'entropic',
  'highEntropyStrings',
)
