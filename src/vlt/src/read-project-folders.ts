import os from 'node:os'
import { type PathBase, type PathScurry } from 'path-scurry'
import { ignoredHomedirFolderNames } from './ignored-homedir-folder-names.ts'

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
export const readProjectFolders = ({
  path = os.homedir(),
  scurry,
  userDefinedProjectPaths,
}: ProjectFolderOptions): PathBase[] => {
  const result: PathBase[] = []
  const traverse: PathBase[] = []

  // collectResult will return true in case it finds a directory that
  // has no package.json file in it but that can still be potentially
  // recursive traversed in the future
  const collectResult = (entry: PathBase) => {
    let foundDir = false
    if (
      entry.isDirectory() &&
      !entry.isSymbolicLink() &&
      entry.name !== 'node_modules' &&
      !entry.name.startsWith('.') &&
      !ignoredHomedirFolderNames.includes(entry.name)
    ) {
      const resolved = entry.fullpath()
      const statPackageJson = scurry.lstatSync(
        `${resolved}/package.json`,
      )
      const hasValidPackageJson =
        statPackageJson &&
        statPackageJson.isFile() &&
        !statPackageJson.isSymbolicLink()
      if (hasValidPackageJson) {
        result.push(entry)
      } else {
        foundDir = true
      }
    }
    return foundDir
  }

  // read entry point folders to collect which ones
  // should we recursively traverse to collect project folders
  const paths =
    userDefinedProjectPaths.length ? userDefinedProjectPaths : [path]
  for (const path of paths) {
    for (const entry of scurry.readdirSync(path, {
      withFileTypes: true,
    })) {
      if (collectResult(entry)) {
        traverse.push(entry)
      }
    }
  }

  // traverse nested directories starting
  // at the entry points previously found
  for (const entry of traverse) {
    for (const child of scurry.readdirSync(entry.fullpath(), {
      withFileTypes: true,
    })) {
      if (collectResult(child)) {
        traverse.push(child)
      }
    }
  }

  return result
}
