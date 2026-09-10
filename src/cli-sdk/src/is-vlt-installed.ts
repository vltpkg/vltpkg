import { lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'

const isDir = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

const isFile = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isFile()

/**
 * Whether `node_modules` in `projectRoot` was built by `vlt install`.
 *
 * The store dir `node_modules/.vlt` is only ever created by reify, so it
 * is the primary marker. A dependency-less install creates no store, so
 * the hidden lockfile it writes is accepted as the fallback; the
 * `actual.load` fs walk only writes that file when the store exists,
 * so a project installed by another client never gains either.
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
  throw error(
    isDir(nodeModules) ?
      `node_modules was not installed by vlt: run \`vlt install\` to rebuild it before running \`vlt ${command}\`, or use \`:host()\` to query another project`
    : `Project is not installed: run \`vlt install\` to build the graph that \`vlt ${command}\` reads`,
    { code: 'EQUERY', path: nodeModules },
  )
}
