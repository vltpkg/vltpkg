import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const unzipScript = fileURLToPath(
  new URL('./unzip.js', import.meta.url),
)

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
    const args = [unzipScript, path, ...r]
    registered.delete(path)
    spawn(process.execPath, args, {
      detached: true,
      stdio: 'ignore',
    }).unref()
  }
}
