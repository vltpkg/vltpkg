import { statSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { join } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Node } from '../node.ts'

/**
 * Make all the packages' bins executable.
 */
export const binChmodAll = async (
  nodes: Iterable<Node>,
  scurry: PathScurry,
): Promise<void> => {
  const chmods: Promise<void>[] = []
  for (const node of nodes) {
    chmods.push(binChmod(node, scurry))
  }
  await Promise.all(chmods)
}

/**
 * Make all the package's bins executable.
 */
export const binChmod = async (
  node: Node,
  scurry: PathScurry,
): Promise<void> => {
  const chmods: Promise<void>[] = []
  if (!node.bins) return
  for (const bin of Object.values(node.bins)) {
    const path = join(node.resolvedLocation(scurry), bin)
    let mode: number
    try {
      mode = statSync(path).mode
    } catch {
      // missing or unreadable (ENOENT, ELOOP, EACCES): skip
      continue
    }
    // a file linked from the global store is executable already, and
    // chmod would change the store
    if ((mode & 0o111) === 0o111) continue
    // `| 0o111` keeps group-writable files at 0o775
    chmods.push(chmod(path, (mode & 0o777) | 0o111))
  }
  await Promise.all(chmods)
}
