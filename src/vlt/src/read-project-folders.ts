import { type PathBase, type PathScurry } from 'path-scurry'

type ProjectFolderOptions = {
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry: PathScurry
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
export const readProjectFolders = (
  dir: string = process.cwd(),
  { projectRoot, scurry }: ProjectFolderOptions,
): PathBase[] => {
  const result: PathBase[] = []

  // if the given directory is also the project root, we then
  // proceed to read its siblings instead
  let cwd = scurry.resolve(dir)
  if (
    cwd.startsWith(projectRoot) &&
    scurry.lstatSync(scurry.resolve(projectRoot, 'package.json'))
  ) {
    dir = scurry.resolve(projectRoot, '..')
    cwd = scurry.resolve(dir)
  }

  const traverse: PathBase[] = []

  // collectResult will return true in case it finds a directory that
  // has no package.json file in it but that can still be potentially
  // recursive traversed in the future
  const collectResult = (entry: PathBase) => {
    let foundDir = false
    if (
      entry.isDirectory() &&
      !entry.isSymbolicLink() &&
      entry.name !== 'node_modules'
    ) {
      //traverse.push(entry)
      const resolved = entry.fullpath()
      const stat = scurry.lstatSync(`${resolved}/package.json`)
      if (stat && stat.isFile() && !stat.isSymbolicLink()) {
        result.push(entry)
      } else {
        foundDir = true
      }
    }
    return foundDir
  }

  // read the provided folder to see if packages are present as
  // direct children items in the directory
  for (const entry of scurry.readdirSync(cwd, {
    withFileTypes: true,
  })) {
    if (collectResult(entry)) {
      traverse.push(entry)
    }
  }

  // traverse nested directories for project folders in case nothing was
  // found in the first level
  if (result.length === 0) {
    for (const entry of traverse) {
      for (const child of scurry.readdirSync(entry.fullpath(), {
        withFileTypes: true,
      })) {
        if (collectResult(child)) {
          traverse.push(child)
        }
      }
    }
  }

  return result
}
