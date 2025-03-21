import { error } from '@vltpkg/error-cause'
import type { ParserState } from '../types.ts'

/**
 * Ensures that security report data is available for all packages in the current graph.
 * Throws an error if security data is not available.
 */
export const scanned = async (state: ParserState) => {
  if (!state.securityArchive?.ok) {
    throw error('Security report data missing')
  }
  return state
}
