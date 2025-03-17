import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **shellAccess** report alert.
 */
export const shell = createSecuritySelectorFilter(
  'shell',
  'shellAccess',
)
