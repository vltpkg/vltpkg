import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **usesEval** report alert.
 */
export const evalParser = createSecuritySelectorFilter(
  'eval',
  'usesEval',
)
