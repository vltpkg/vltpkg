import { join } from 'node:path'

/**
 * Prevent `vlx exec-cache info/delete/ls` from reaching out of its
 * safe little sandbox.
 */
export const mountPath = (root: string, path: string): string => {
  path = join(path)
  path = path.startsWith(root) ? path.substring(root.length) : path
  return join(root, join('/', path))
}
