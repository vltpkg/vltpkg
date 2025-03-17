import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **debugAccess** report alert.
 */
export const debug = createSecuritySelectorFilter(
  'debug',
  'debugAccess',
)
