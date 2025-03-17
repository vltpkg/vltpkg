import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have an **installScripts** report alert.
 */
export const scripts = createSecuritySelectorFilter(
  'scripts',
  'installScripts',
)
