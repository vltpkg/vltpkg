import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **hasNativeCode** report alert.
 */
export const nativeParser = createSecuritySelectorFilter(
  'native',
  'hasNativeCode',
)
