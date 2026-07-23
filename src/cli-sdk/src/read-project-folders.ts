import { availableParallelism, homedir } from 'node:os'
import { dirname } from 'node:path'
import type { PathBase, PathScurry } from 'path-scurry'

import { callLimit } from 'promise-call-limit'

const limit = Math.max(availableParallelism() - 1, 1) * 8
let home: string
try {
  home = homedir()
} catch {
  home = dirname(process.cwd())
}

const ignoredHomedirFolderNames = [
  'downloads',
  'movies',
  'music',
  'pictures',
  'private',
  'library',
  'dropbox',
].concat(
  process.platform === 'darwin' ?
    [
      'public',
      'private',
      'applications',
      'applications (parallels)',
      'sites',
      'sync',
    ]
  : process.platform === 'win32' ?
    [
      'appdata',
      'application data',
      'favorites',
      'links',
      'videos',
      'contacts',
      'searches',
    ]
  : ['videos', 'public'],
)

type ProjectFolderOptions = {
  path?: string
  scurry: PathScurry
  userDefinedProjectPaths: string[]
}

/**
 * Retrieves folders from a given directory, if that directory is
 * recognized to be the current cli project root folder then we
 * proceed to read its siblings.
 *
 * Traverses nested directory recursively until project folders can
 * be find, always stopping at the first level where a package.json
 * is present.
 */
export const readProjectFolders = async (
  {
    path = home,
    scurry,
    userDefinedProjectPaths,
  }: ProjectFolderOptions,
  maxDepth = 7,
): Promise<PathBase[]> => {
  const result: PathBase[] = []
  const homeEntry = scurry.cwd.resolve(home)

  const paths =
    userDefinedProjectPaths.length ? userDefinedProjectPaths : [path]

  const step = (entry: PathBase, depth: number) => async () => {
    try {
      for (const child of await entry.readdir()) {
        if (
          await collectResult(
            child,
            result,
            scurry,
            entry === homeEntry,
            depth,
            maxDepth,
          )
        ) {
          traverse.push(step(child, depth + 1))
        }
      }
      /* c8 ignore next 4 */
    } catch {
      // Ignore directories that can't be read.
      // This commonly happens in restricted environments.
    }
  }

  let traverse = (
    await Promise.all(paths.map(path => scurry.lstat(path)))
  )
    .filter(p => !!p)
    .map(p => step(p, 0))

  // have to do it in phases this way because pushing into the queue
  // during the promise-call-limit confuses its tracking.
  let t: (() => Promise<void>)[]
  do {
    t = traverse
    traverse = []

    await callLimit(t, { limit })
  } while (traverse.length)

  return result
}

const collectResult = async (
  entry: PathBase,
  result: PathBase[],
  scurry: PathScurry,
  fromHome: boolean,
  depth: number,
  maxDepth: number,
): Promise<boolean> => {
  if (
    !entry.isDirectory() ||
    entry.isSymbolicLink() ||
    entry.name === 'node_modules' ||
    (fromHome &&
      ignoredHomedirFolderNames.includes(entry.name.toLowerCase())) ||
    entry.name.startsWith('.') ||
    depth > maxDepth
  ) {
    return false
  }

  const resolved = entry.fullpath()
  const statPackageJson = await scurry
    .lstat(`${resolved}/package.json`)
    .catch(() => {})
  const hasValidPackageJson =
    statPackageJson &&
    statPackageJson.isFile() &&
    !statPackageJson.isSymbolicLink()

  if (hasValidPackageJson) result.push(entry)

  return !hasValidPackageJson
}
