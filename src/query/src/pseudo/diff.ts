import { error } from '@vltpkg/error-cause'
import { asPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import { removeDanglingEdges, removeNode } from './helpers.ts'
import { parseInternals } from './spec.ts'
import type { ParserState } from '../types.ts'

/**
 * Given a set of changed file paths and a package location
 * (relative to the project root), returns true if any changed
 * file belongs to that package.
 */
export const packageHasChanges = (
  changedFiles: Set<string>,
  packageLocation: string,
): boolean => {
  // Normalize the package location — remove leading './'
  const normalized =
    packageLocation.startsWith('./') ?
      packageLocation.slice(2)
    : packageLocation

  // Root package — check if any file at root level changed
  // (not inside a subdirectory that is another package)
  if (!normalized || normalized === '.') {
    // Any changed file means the root package changed
    return changedFiles.size > 0
  }

  // Check if any changed file starts with the package path
  for (const file of changedFiles) {
    if (file === normalized || file.startsWith(normalized + '/')) {
      return true
    }
  }
  return false
}

/**
 * :diff(<commitish>) Pseudo-Selector, matches only nodes
 * whose files have changed between the current state and
 * the specified commitish reference.
 *
 * Requires a `diffFiles` provider to be set on the
 * {@link ParserState}. The provider is a callback that
 * takes a commitish string and returns a Set of changed
 * file paths relative to the project root.
 *
 * When called with no argument, defaults to HEAD (uncommitted changes).
 *
 * Examples:
 * - :diff() — packages with uncommitted changes (defaults to HEAD)
 * - :diff(main) — packages changed since main branch
 * - :diff(HEAD~1) — packages changed since last commit
 * - :diff("v1.0.0") — packages changed since tag v1.0.0
 */
export const diff = async (state: ParserState) => {
  const currentNodes = asPostcssNodeWithChildren(state.current).nodes
  const hasArg =
    currentNodes.length > 0 &&
    asPostcssNodeWithChildren(currentNodes[0]).nodes.length > 0

  let commitish = 'HEAD'
  if (hasArg) {
    try {
      commitish = parseInternals(currentNodes).specValue
    } catch (err) {
      throw error('Failed to parse :diff selector', {
        cause: err,
      })
    }
  }

  if (!state.diffFiles) {
    throw error('The :diff() selector requires a diffFiles provider')
  }

  const changedFiles = state.diffFiles(commitish)

  for (const node of state.partial.nodes) {
    /* c8 ignore next -- location is always set on real nodes */
    const location = node.location ?? ''
    if (!packageHasChanges(changedFiles, location)) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
