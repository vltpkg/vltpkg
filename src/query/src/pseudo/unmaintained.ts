import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **unmaintained** report alert.
 */
export const unmaintained = createSecuritySelectorFilter(
  'unmaintained',
  'unmaintained',
)
