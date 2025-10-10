import { statSync, existsSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
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
    const path = scurry.resolve(
      `${node.resolvedLocation(scurry)}/${bin}`,
    )
    // only try to make executable if the file exists
    if (existsSync(path)) {
      chmods.push(makeExecutable(path))
    }
  }
  await Promise.all(chmods)
}

// 0 is "not yet set"
// This is defined by doing `0o111 | <mode>` so that systems
// that create files group-writable result in 0o775 instead of 0o755
let execMode = 0
const makeExecutable = async (path: string) => {
  if (!execMode) {
    execMode = (statSync(path).mode & 0o777) | 0o111
  }
  await chmod(path, execMode)
}
