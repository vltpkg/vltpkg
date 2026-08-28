import { spawn } from 'node:child_process'
import module from 'node:module'
import { daemonSpawn, detached, endPayload } from './daemon.ts'
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
  // The compile cache is enabled in-process by the CLI entry, which does
  // not propagate to child processes, so the worker has to be pointed at
  // it through the environment to skip re-compiling its bundle.
  const compileCacheDir = module.getCompileCacheDir()
  for (const [path, r] of registered) {
    /* c8 ignore next */
    if (!r.size) return
    const {
      command,
      args,
      env: daemonEnv,
    } = daemonSpawn(__CODE_SPLIT_SCRIPT_NAME)
    const env = { ...process.env, ...daemonEnv }
    if (compileCacheDir) env.NODE_COMPILE_CACHE ??= compileCacheDir
    args.push(path)
    registered.delete(path)
    const proc = spawn(command, args, {
      detached,
      stdio: ['pipe', 'ignore', 'ignore'],
      env,
    })
    for (const key of r) {
      proc.stdin.write(`${key}\0`)
    }
    endPayload(proc.stdin)
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
