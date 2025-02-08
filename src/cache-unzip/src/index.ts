import { spawn } from 'child_process'
import { __CODE_SPLIT_SCRIPT_NAME } from './unzip.ts'

let didProcessBeforeExitHook = false
const registered = new Map<string, Set<string>>()

export const register = (path: string, key: string): void => {
  const r = registered.get(path) ?? new Set<string>()
  r.add(key)
  registered.set(path, r)
  if (!didProcessBeforeExitHook) {
    didProcessBeforeExitHook = true
    process.on('beforeExit', handleBeforeExit)
  }
}

const handleBeforeExit = () => {
  for (const [path, r] of registered) {
    /* c8 ignore next */
    if (!r.size) return
    const args = [__CODE_SPLIT_SCRIPT_NAME, path]
    registered.delete(path)
    const proc = spawn(process.execPath, args, {
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    for (const key of r) {
      proc.stdin.write(`${key}\0`)
    }
    proc.unref()
  }
}
