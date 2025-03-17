import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **filesystemAccess** report alert.
 */
export const fs = createSecuritySelectorFilter(
  'fs',
  'filesystemAccess',
)
