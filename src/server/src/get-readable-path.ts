import { homedir } from 'node:os'
import { dirname } from 'node:path'

let home: string
try {
  home = homedir()
} catch {
  // In restricted environments (like locked-down Codespaces),
  // homedir() might fail. Fall back to current working directory.
  home = dirname(process.cwd())
}

export const getReadablePath = (path: string) =>
  path.startsWith(home) ? '~' + path.substring(home.length) : path
