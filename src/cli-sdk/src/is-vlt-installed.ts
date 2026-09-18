import { lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'

// `throwIfNoEntry: false` only covers ENOENT: a `node_modules` that is a
// file (ENOTDIR) or unreadable (EACCES) still throws, and neither of
// those is a vlt install.
const lstat = (path: string) => {
  try {
    return lstatSync(path, { throwIfNoEntry: false })
  } catch {
    return undefined
  }
}

const isDir = (path: string) => !!lstat(path)?.isDirectory()

const isFile = (path: string) => !!lstat(path)?.isFile()

/**
 * Whether `node_modules` in `projectRoot` was built by `vlt install`.
 *
 * The store dir `node_modules/.vlt` is only ever created by reify, so it
 * is the primary marker. A dependency-less install creates no store, so
 * the hidden lockfile it writes is accepted as the fallback. Outside
 * of reify, the `actual.load` fs walk and `vlt build` only write that
 * file when the store exists, so a project installed by another client
 * never gains either.
 */
export const isVltInstalled = (projectRoot: string): boolean =>
  isDir(resolve(projectRoot, 'node_modules/.vlt')) ||
  isFile(resolve(projectRoot, 'node_modules/.vlt-lock.json'))

/**
 * Throws when `node_modules` was not installed by vlt. Without a vlt
 * install `actual.load` walks a foreign `node_modules`, recognizes
 * nothing and reports every dependency as missing - an empty answer
 * that looks like a real one.
 */
export const assertVltInstalled = (
  projectRoot: string,
  command: string,
): void => {
  if (isVltInstalled(projectRoot)) return
  const nodeModules = resolve(projectRoot, 'node_modules')
  const hint =
    isDir(nodeModules) ?
      `run \`vlt install\` to rebuild it before running \`vlt ${command}\``
    : `run \`vlt install\` before running \`vlt ${command}\``
  throw error(`No vlt install found in ${nodeModules}\n\n  ${hint}`, {
    code: 'EQUERY',
    path: nodeModules,
  })
}
