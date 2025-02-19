import { availableParallelism, homedir } from 'os'
import { type PathBase, type PathScurry } from 'path-scurry'
import { callLimit } from 'promise-call-limit'
import { ignoredHomedirFolderNames } from './ignored-homedir-folder-names.ts'

const limit = Math.max(availableParallelism() - 1, 1) * 8
const home = homedir()

type ProjectFolderOptions = {
  /**
   * The standard path to read from, defaults to the user's home directory.
   */
  path?: string
  /**
   * A {@link PathScurry} object, for use in globs.
   */
  scurry: PathScurry
  /**
   * A list of user defined project paths set in the configuration file.
   */
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
export const readProjectFolders = async ({
  path = home,
  scurry,
  userDefinedProjectPaths,
}: ProjectFolderOptions): Promise<PathBase[]> => {
  const result: PathBase[] = []
  const homeEntry = scurry.cwd.resolve(home)

  // read entry point folders to collect which ones
  // should we recursively traverse to collect project folders
  const paths =
    userDefinedProjectPaths.length ? userDefinedProjectPaths : [path]

  const step = (entry: PathBase) => async () => {
    for (const child of await entry.readdir()) {
      if (collectResult(child, result, scurry, entry === homeEntry)) {
        traverse.push(step(child))
      }
    }
  }

  let traverse = (
    await Promise.all(paths.map(path => scurry.lstat(path)))
  )
    .filter(p => !!p)
    .map(step)

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

// collectResult will return true in case it finds a directory that
// has no package.json file in it but that can still be potentially
// recursive traversed in the future
const collectResult = (
  entry: PathBase,
  result: PathBase[],
  scurry: PathScurry,
  fromHome: boolean,
): boolean => {
  if (
    !entry.isDirectory() ||
    entry.isSymbolicLink() ||
    entry.name === 'node_modules' ||
    (fromHome &&
      ignoredHomedirFolderNames.includes(entry.name.toLowerCase()))
  ) {
    return false
  }

  const resolved = entry.fullpath()
  const statPackageJson = scurry.lstatSync(`${resolved}/package.json`)
  const hasDotGit = scurry.lstatSync(`${resolved}/.git`)
  const hasValidPackageJson =
    statPackageJson &&
    statPackageJson.isFile() &&
    !statPackageJson.isSymbolicLink()

  if (hasValidPackageJson) result.push(entry)

  // do not descend if we're in a root of a git project or C project
  // TODO: make this more consistent with how we determine
  // "project-root-ness" in the walk up the folder tree.
  return !hasDotGit && !hasValidPackageJson
}
