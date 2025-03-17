import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **networkAccess** report alert.
 */
export const network = createSecuritySelectorFilter(
  'network',
  'networkAccess',
)
