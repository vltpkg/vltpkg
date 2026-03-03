import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'
import { asPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import { removeDanglingEdges, removeNode } from './helpers.ts'
import { parseInternals } from './spec.ts'
import type { ParserState } from '../types.ts'

/**
 * Pattern to validate commitish arguments.
 * Allows branch names, tags, SHAs, HEAD~N, HEAD^N, etc.
 * Rejects shell metacharacters to prevent command injection.
 */
const VALID_COMMITISH = /^[a-zA-Z0-9_./@^~:#{}-]+$/

/**
 * Validates that a commitish string is safe to use in a git command.
 */
export const validateCommitish = (commitish: string): string => {
  if (!commitish) {
    throw error('Missing commitish argument for :diff() selector')
  }
  if (!VALID_COMMITISH.test(commitish)) {
    throw error('Invalid commitish argument for :diff() selector', {
      found: commitish,
    })
  }
  return commitish
}

/**
 * Runs `git diff --name-only <commitish>` and returns the
 * list of changed file paths relative to the project root.
 */
export const getChangedFiles = (
  commitish: string,
  projectRoot: string,
): Set<string> => {
  const safeCommitish = validateCommitish(commitish)
  try {
    const stdout = execSync(`git diff --name-only ${safeCommitish}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30_000,
    })
    const files = new Set<string>()
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim()
      if (trimmed) {
        files.add(trimmed)
      }
    }
    return files
  } catch (err) {
    throw error(
      `Failed to run git diff for commitish: ${safeCommitish}`,
      { cause: err },
    )
  }
}

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
 * Examples:
 * - :diff(main) — packages changed since main branch
 * - :diff(HEAD~1) — packages changed since last commit
 * - :diff("v1.0.0") — packages changed since tag v1.0.0
 */
export const diff = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :diff selector', {
      cause: err,
    })
  }

  const commitish = internals.specValue

  // Get the project root from any available node
  let projectRoot = '.'
  for (const node of state.partial.nodes) {
    if (node.projectRoot) {
      projectRoot = node.projectRoot
      break
    }
  }

  // Resolve project root to an absolute path
  const resolvedRoot = resolve(projectRoot)

  // Get changed files once for all nodes
  const changedFiles = getChangedFiles(commitish, resolvedRoot)

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
