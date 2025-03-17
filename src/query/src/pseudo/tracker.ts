import { createSecuritySelectorFilter } from './helpers.ts'

/**
 * Filters out any node that does not have a **telemetry** report alert.
 */
export const tracker = createSecuritySelectorFilter(
  'tracker',
  'telemetry',
)
