import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Node } from '../node.ts'

const onDisk = (dir: string) => {
  try {
    return !!lstatSync(join(dir, 'binding.gyp'), {
      throwIfNoEntry: false,
    })?.isFile()
  } catch {
    // e.g. ENOTDIR, location is a file
    return false
  }
}

/**
 * True if the package has a root binding.gyp (implicit install).
 * Checked on disk past the path cache, which may still hold ENOENT
 * from before the extraction.
 */
export const hasBindingGyp = (node: Node, scurry: PathScurry) =>
  onDisk(node.resolvedLocation(scurry))
