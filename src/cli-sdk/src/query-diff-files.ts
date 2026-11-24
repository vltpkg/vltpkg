import { execSync } from 'node:child_process'
import { error } from '@vltpkg/error-cause'
import type { DiffFilesProvider } from '@vltpkg/query'

/**
 * Pattern to validate commitish arguments.
 * Allows branch names, tags, SHAs, HEAD~N, HEAD^N, etc.
 * Rejects shell metacharacters to prevent command injection.
 */
const VALID_COMMITISH = /^[a-zA-Z0-9_./@^~:#{}-]+$/

/**
 * Validates that a commitish string is safe to use
 * in a git command.
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
 * Creates a {@link DiffFilesProvider} that uses
 * `git diff --name-only` to determine changed files.
 * @param {string} projectRoot - The absolute path to the
 *   project root directory where git commands will be
 *   executed.
 * @returns {DiffFilesProvider} A function that takes a
 *   commitish and returns a Set of changed file paths
 *   relative to the project root.
 */
export const createDiffFilesProvider = (
  projectRoot: string,
): DiffFilesProvider => {
  // Cache results per commitish to avoid repeated git calls
  const cache = new Map<string, Set<string>>()

  return (commitish: string): Set<string> => {
    const cached = cache.get(commitish)
    if (cached) return cached

    const safeCommitish = validateCommitish(commitish)
    try {
      // --relative: paths from the project root, which can be below
      // the root of the git repo. --no-renames: a move changes both
      // packages. -z: do not quote non-ASCII or special names.
      // --: never read the commitish as a file name.
      const stdout = execSync(
        `git diff --name-only --relative --no-renames -z ${safeCommitish} --`,
        {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30_000,
        },
      )
      const files = new Set(stdout.split('\0').filter(Boolean))
      cache.set(commitish, files)
      return files
    } catch (err) {
      throw error(
        `Failed to run git diff for commitish: ${safeCommitish}`,
        { cause: err },
      )
    }
  }
}
