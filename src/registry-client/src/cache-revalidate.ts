import { spawn } from 'node:child_process'
import { __CODE_SPLIT_SCRIPT_NAME } from './revalidate.ts'
import { pathToFileURL } from 'node:url'

const isDeno =
  (globalThis as typeof globalThis & { Deno?: any }).Deno != undefined

let didProcessBeforeExitHook = false
const registered = new Map<string, Set<string>>()

export const register = (
  path: string,
  method: 'HEAD' | 'GET',
  url: string | URL,
): void => {
  const r = registered.get(path) ?? new Set<string>()
  const key = `${method} ${url}`
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
    const env = { ...process.env }
    const args = []
    /* c8 ignore start */
    // When compiled the script to be run is passed as an
    // environment variable and then routed by the main entry point
    if (process.env.__VLT_INTERNAL_COMPILED) {
      env.__VLT_INTERNAL_MAIN = pathToFileURL(
        __CODE_SPLIT_SCRIPT_NAME,
      ).toString()
      args.push(path)
    } else {
      // If we are running deno from source we need to add the
      // unstable flags we need. The '-A' flag does not need
      // to be passed in as Deno supplies that automatically.
      if (isDeno) {
        args.push(
          '--unstable-node-globals',
          '--unstable-bare-node-builtins',
        )
      }
      /* c8 ignore stop */
      args.push(__CODE_SPLIT_SCRIPT_NAME, path)
    }
    registered.delete(path)
    // Deno on Windows does not support detached processes
    // https://github.com/denoland/deno/issues/25867
    // TODO: figure out something better to do here?
    /* c8 ignore next */
    const detached = !(isDeno && process.platform === 'win32')
    const proc = spawn(process.execPath, args, {
      detached,
      stdio: ['pipe', 'ignore', 'ignore'],
      env,
    })
    for (const key of r) {
      proc.stdin.write(`${key}\0`)
    }
    proc.stdin.end()
    // Another Deno oddity. Calling unref on a spawned process will kill the
    // process unless it is detached. https://github.com/denoland/deno/issues/21446
    // So in this case Deno on Windows will be slower to exit the main process
    // since it will wait for the child process to exit.
    // TODO: figure out something better to do here?
    if (detached) {
      proc.unref()
    }
  }
}
